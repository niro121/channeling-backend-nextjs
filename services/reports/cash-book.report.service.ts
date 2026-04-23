'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { getAccountBalance } from '@/services/accounting.service';
import type {
  CashBookReportQuery,
  CashBookReportResponse,
  CashBookReportRow,
} from '@/types/reports/cash-book';

const MAX_RANGE_DAYS = getReportMaxRangeDays('cash_book', 31);
const MAX_LINES = getReportMaxRecords('cash_book', 50000);

function parseDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const [y, m, d] = trimmed.split('-').map(Number);
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (asEnd) return new Date(year, month, day, 23, 59, 59, 999);
  return new Date(year, month, day, 0, 0, 0, 0);
}

function parseLocalDayRange(fromDate: string, toDate: string): { from: Date; to: Date } | null {
  const from = parseDateTime(fromDate, false);
  const to = parseDateTime(toDate, true);
  if (!from || !to) return null;
  return { from, to };
}

function mapPaymentType(paymentMethod: number | null | undefined): string {
  if (paymentMethod == null) return '-';
  return PAYMENT_METHOD_NAMES[paymentMethod] ?? 'Other';
}

export async function getCashBookReportService(
  query: CashBookReportQuery
): Promise<CashBookReportResponse> {
  const parsedRange = parseLocalDayRange(query.dateFrom, query.dateTo);
  if (!parsedRange) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      cashBookName: '-',
      cashBookCode: null,
      message: 'From and To date/time are required.',
    };
  }

  const { from, to } = parsedRange;
  if (from.getTime() > to.getTime()) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      cashBookName: '-',
      cashBookCode: null,
      message: 'From date/time must be before or equal to To date/time.',
    };
  }

  const daySpan = getInclusiveDaySpan(from, to);
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      cashBookName: '-',
      cashBookCode: null,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  if (!query.cashBookAccountId || query.cashBookAccountId === '__all__') {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      cashBookName: '-',
      cashBookCode: null,
      message: 'Please select a cash book.',
    };
  }

  const account = await prisma.account.findUnique({
    where: { id: query.cashBookAccountId },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
      locationId: true,
      userId: true,
    },
  });

  if (!account || !account.isActive || account.type !== 'CASH') {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      cashBookName: '-',
      cashBookCode: null,
      message: 'Selected cash book was not found.',
    };
  }

  const allCashAccounts = await prisma.account.findMany({
    where: { type: 'CASH', isActive: true },
    select: { id: true, parentAccountId: true, locationId: true, name: true, code: true },
  });

  const byParent = new Map<string, string[]>();
  for (const a of allCashAccounts) {
    if (!a.parentAccountId) continue;
    const existing = byParent.get(a.parentAccountId) ?? [];
    existing.push(a.id);
    byParent.set(a.parentAccountId, existing);
  }

  const scopedAccountIds = new Set<string>([account.id]);
  const queue: string[] = [account.id];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const children = byParent.get(current) ?? [];
    for (const childId of children) {
      if (scopedAccountIds.has(childId)) continue;
      scopedAccountIds.add(childId);
      queue.push(childId);
    }
  }

  // Branch-selected scope: include all CASH accounts in that branch/location
  // (till accounts may not always be nested as descendants under the branch account).
  if (account.locationId && !account.userId) {
    for (const a of allCashAccounts) {
      if (a.locationId === account.locationId) {
        scopedAccountIds.add(a.id);
      }
    }
  }

  const accountMap = new Map(
    allCashAccounts.map((a) => [a.id, { name: a.name ?? '-', code: a.code ?? null }])
  );

  const accountIds = Array.from(scopedAccountIds);
  // Mongo-safe two-step date filtering (avoid relation date filters on journalLine).
  const journalsInRange = await prisma.journal.findMany({
    where: { date: { gte: from, lte: to } },
    select: { id: true },
    orderBy: { date: 'asc' },
  });
  const journalIdsInRange = journalsInRange.map((j) => j.id);

  const rangeCount = journalIdsInRange.length
    ? await prisma.journalLine.count({
        where: {
          accountId: { in: accountIds },
          journalId: { in: journalIdsInRange },
        },
      })
    : 0;
  if (rangeCount > MAX_LINES) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      cashBookName: account.name ?? '-',
      cashBookCode: account.code ?? null,
      message: `Too many records in selected range (${rangeCount}). Please narrow the date range.`,
    };
  }

  let openingBalanceCents = 0;
  const openingAsOf = new Date(from.getTime() - 1);
  for (const scopedAccountId of accountIds) {
    openingBalanceCents += await getAccountBalance(scopedAccountId, openingAsOf);
  }

  const lines = journalIdsInRange.length
    ? await prisma.journalLine.findMany({
        where: {
          accountId: { in: accountIds },
          journalId: { in: journalIdsInRange },
        },
    select: {
      id: true,
      accountId: true,
      debitAmount: true,
      creditAmount: true,
      paymentMethod: true,
      journal: {
        select: {
          date: true,
          journalNumber: true,
          description: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ journal: { date: 'asc' } }, { journal: { createdAt: 'asc' } }],
      })
    : [];

  let runningBalance = openingBalanceCents;
  const rows: CashBookReportRow[] = lines.map((line) => {
    runningBalance += netEffectForAccountType(line.debitAmount, line.creditAmount, 'CASH');
    const acc = accountMap.get(line.accountId);
    const accountLabel = acc?.code ? `${acc.name} (${acc.code})` : (acc?.name ?? '-');
    return {
      id: line.id,
      date: line.journal.date,
      journalNumber: line.journal.journalNumber,
      accountLabel,
      description: line.journal.description,
      paymentMethodLabel: mapPaymentType(line.paymentMethod),
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      runningBalance,
    };
  });

  return {
    success: true,
    data: rows,
    totalRecords: rows.length,
    openingBalanceCents,
    closingBalanceCents: runningBalance,
    cashBookName: account.name ?? '-',
    cashBookCode: account.code ?? null,
  };
}
