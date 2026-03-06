'use server';

import prisma from '@/lib/prisma';
import type { AccountStatementResult, AccountStatementLine } from '@/types/accounting';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { getAccountBalance } from './balance-calc.service';
import { mapAccount } from './map-account';

// --- getAccountStatement ---
export async function getAccountStatement(
  accountId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<AccountStatementResult | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });
  if (!account) return null;

  const journalWhere: { date?: { gte?: Date; lte?: Date } } = {};
  if (fromDate) journalWhere.date = { ...journalWhere.date, gte: fromDate };
  if (toDate) journalWhere.date = { ...journalWhere.date, lte: toDate };

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      ...(Object.keys(journalWhere).length
        ? { journal: journalWhere }
        : {}),
    },
    include: {
      journal: true,
    },
  });

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
  };
}
