'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { AccountStatementResult, AccountStatementLine } from '@/types/accounting';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { getAccountBalance } from './balance-calc.service';
import { mapAccount } from './map-account';

const DEFAULT_STATEMENT_MAX_JOURNALS = 10000;

/** Max journals (and max statement lines) per request (env: STATEMENT_MAX_JOURNALS). Avoids huge $in and memory. */
function getStatementMaxJournals(): number {
  const raw = process.env.STATEMENT_MAX_JOURNALS;
  if (raw == null || raw === '') return DEFAULT_STATEMENT_MAX_JOURNALS;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_STATEMENT_MAX_JOURNALS;
  return n;
}

const journalLineSelect = {
  id: true,
  journalId: true,
  debitAmount: true,
  creditAmount: true,
  paymentMethod: true,
  journal: {
    select: {
      date: true,
      journalNumber: true,
      description: true,
      referenceType: true,
      referenceId: true,
      createdAt: true,
    },
  },
} as const;

// --- getAccountStatement ---
export async function getAccountStatement(
  accountId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<AccountStatementResult | null> {
  const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_TILL_STATEMENT === '1';

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });
  if (!account) return null;

  const maxLines = getStatementMaxJournals();

  // MongoDB: Prisma relation filters (journal: { date: { gte, lte } }) can fail to match.
  // Use a two-step query: find journal IDs in date range (capped), then lines for those journals.
  // Always cap lines and use DB orderBy to avoid loading/sorting millions of rows in memory.
  const lineOrderBy = [{ journal: { date: 'asc' as const } }, { journal: { createdAt: 'asc' as const } }];
  let lines: Prisma.JournalLineGetPayload<{ select: typeof journalLineSelect }>[];
  let truncatedMessage: string | undefined;

  if (fromDate || toDate) {
    const journalDateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) journalDateFilter.gte = fromDate;
    if (toDate) journalDateFilter.lte = toDate;
    const maxJournals = getStatementMaxJournals();
    const journalsInRange = await prisma.journal.findMany({
      where: { date: journalDateFilter },
      select: { id: true },
      orderBy: { date: 'asc' },
      take: maxJournals + 1,
    });
    if (journalsInRange.length > maxJournals) {
      throw new Error(
        `Too many transactions in this date range (max ${maxJournals.toLocaleString()}). Please choose a shorter period.`
      );
    }
    const journalIds = journalsInRange.map((j) => j.id);
    lines = await prisma.journalLine.findMany({
      where: {
        accountId,
        ...(journalIds.length > 0 ? { journalId: { in: journalIds } } : { journalId: { in: [] } }),
      },
      select: journalLineSelect,
      orderBy: lineOrderBy,
      take: maxLines + 1,
    });
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      truncatedMessage = `Showing first ${maxLines.toLocaleString()} transactions. Use a shorter date range to see all.`;
    }
  } else {
    const lineCount = await prisma.journalLine.count({ where: { accountId } });
    if (lineCount > maxLines) {
      throw new Error(
        `This account has ${lineCount.toLocaleString()} transactions. Please select a date range to view the statement (max ${maxLines.toLocaleString()} lines per request).`
      );
    }
    lines = await prisma.journalLine.findMany({
      where: { accountId },
      select: journalLineSelect,
      orderBy: lineOrderBy,
      take: maxLines,
    });
  }

  if (DEBUG) {
    const totalLinesNoFilter = await prisma.journalLine.count({ where: { accountId } });
    console.debug('[getAccountStatement]', {
      accountId,
      accountName: account.name,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
      totalJournalLinesForAccount: totalLinesNoFilter,
      returnedLineCount: lines.length,
      truncatedMessage: truncatedMessage ?? null,
    });
  }

  // DB already ordered by journal.date asc, journal.createdAt asc; keep in-memory sort for tie-break consistency
  lines.sort((a, b) => {
    const d = a.journal.date.getTime() - b.journal.date.getTime();
    if (d !== 0) return d;
    return (
      (a.journal.createdAt?.getTime() ?? 0) - (b.journal.createdAt?.getTime() ?? 0)
    );
  });

  const openingBalance = fromDate
    ? await getAccountBalance(accountId, new Date(fromDate.getTime() - 1))
    : 0;

  let running = openingBalance;
  const resultLines: AccountStatementLine[] = lines.map((line) => {
    const net = netEffectForAccountType(
      line.debitAmount,
      line.creditAmount,
      account.type
    );
    running += net;
    return {
      id: line.id,
      date: line.journal.date,
      journalId: line.journalId,
      journalNumber: line.journal.journalNumber,
      description: line.journal.description,
      referenceType: line.journal.referenceType,
      referenceId: line.journal.referenceId,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      runningBalance: running,
      paymentMethod: line.paymentMethod ?? undefined,
    };
  });

  return {
    account: mapAccount(account),
    lines: resultLines,
    openingBalance,
    closingBalance: running,
    ...(truncatedMessage ? { truncatedMessage } : {}),
  };
}
