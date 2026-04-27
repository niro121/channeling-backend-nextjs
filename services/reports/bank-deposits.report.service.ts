'use server';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { RECEIPT_METHOD } from '@/types/receipt';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import type { BankDepositsReportQuery, BankDepositsReportRow } from '@/types/reports/bank-deposits';

const MAX_RANGE_DAYS = getReportMaxRangeDays('bank_deposits', 31);
const MAX_RECORDS = getReportMaxRecords('bank_deposits', 20000);

const SRI_LANKA_UTC_OFFSET_MINUTES = 330;
function parseSriLankaDay(dateStr: string): { start: Date; end: Date } | null {
  const s = (dateStr ?? '').trim();
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const offsetMs = SRI_LANKA_UTC_OFFSET_MINUTES * 60 * 1000;
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - offsetMs;
  const endUtcMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMs;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

function parseDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const day = parseSriLankaDay(trimmed);
  if (!day) return null;
  return asEnd ? day.end : day.start;
}

function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseDateTime(dateFrom, false);
  const end = parseDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
}

function normAll(v: string | undefined): string {
  const s = (v ?? '').trim();
  return s || '__all__';
}

export async function getBankDepositsReportService(
  query: BankDepositsReportQuery
): Promise<{ success: boolean; data: BankDepositsReportRow[]; totalRecords: number; message?: string }> {
  const range = parseFromTo(query.dateFrom, query.dateTo);
  if (!range) {
    return { success: false, data: [], totalRecords: 0, message: 'From date and to date are required.' };
  }
  const from = range.start;
  const to = range.end;
  if (from.getTime() > to.getTime()) {
    return { success: false, data: [], totalRecords: 0, message: 'From date must be before or equal to to date.' };
  }

  const daySpan = getInclusiveDaySpan(from, to);
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  const bankAccountId = normAll(query.bankAccountId);
  const userId = normAll(query.userId);
  const branchLocationId = normAll(query.locationId);

  const where: Prisma.ReceiptWhereInput = {
    method: { in: [RECEIPT_METHOD.BANK_DEPOSIT, RECEIPT_METHOD.BANK_WITHDRAW] },
    createdAt: { gte: from, lte: to },
    ...(bankAccountId !== '__all__' ? { bankId: bankAccountId } : {}),
    ...(userId !== '__all__' ? { createdBy: userId } : {}),
    ...(branchLocationId !== '__all__'
      ? {
          /** Same branch as UI column: prefer userLocationId, else locationId */
          OR: [
            { userLocationId: branchLocationId },
            {
              AND: [{ userLocationId: null }, { locationId: branchLocationId }],
            },
          ],
        }
      : {}),
  };

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: [{ createdAt: 'asc' }, { receiptNo: 'asc' }],
    take: MAX_RECORDS + 1,
    select: {
      id: true,
      method: true,
      receiptNoString: true,
      remarks: true,
      amount: true,
      createdAt: true,
      locationId: true,
      userLocationId: true,
      createdBy: true,
      bankId: true,
      bank: true,
    },
  });

  const hasMore = receipts.length > MAX_RECORDS;
  const sliced = hasMore ? receipts.slice(0, MAX_RECORDS) : receipts;

  const locationIds = Array.from(
    new Set(
      sliced
        .flatMap((r) => [r.userLocationId, r.locationId])
        .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    )
  );
  const userIds = Array.from(
    new Set(sliced.map((r) => r.createdBy).filter((x): x is string => typeof x === 'string' && x.trim() !== ''))
  );
  const bankAccountIds = Array.from(
    new Set(sliced.map((r) => r.bankId).filter((x): x is string => typeof x === 'string' && x.trim() !== ''))
  );

  const [locations, users, bankAccounts] = await Promise.all([
    locationIds.length
      ? prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : Promise.resolve([]),
    bankAccountIds.length
      ? prisma.bankAccount.findMany({
          where: { id: { in: bankAccountIds } },
          select: {
            id: true,
            name: true,
            accountNumber: true,
            bank: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const locationById = new Map(locations.map((l) => [l.id, l]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const bankAccountById = new Map(
    bankAccounts.map((b) => [
      b.id,
      `${b.name} - ${b.accountNumber}${b.bank?.name ? ` (${b.bank.name})` : ''}`,
    ])
  );

  const data: BankDepositsReportRow[] = sliced.map((r) => {
    const userLocId = r.userLocationId ?? r.locationId ?? null;
    const loc = userLocId ? locationById.get(userLocId) ?? null : null;
    const userLocationLabel = loc?.name ? `${loc.name}${loc.code ? ` (${loc.code})` : ''}` : null;
    const u = r.createdBy ? userById.get(r.createdBy) ?? null : null;
    const userLabel = u?.name ? formatUserDisplayName(u.name, u.id, u.staff?.code) : null;
    const mappedBankAccountName = r.bankId ? bankAccountById.get(r.bankId) ?? null : null;
    return {
      id: r.id,
      transactionType:
        r.method === RECEIPT_METHOD.BANK_WITHDRAW
          ? 'Bank Withdraw'
          : r.method === RECEIPT_METHOD.BANK_DEPOSIT
            ? 'Bank Deposit'
            : null,
      receiptNoString: r.receiptNoString ?? null,
      remarks: (r.remarks ?? '').trim() || null,
      userLocation: userLocationLabel,
      user: userLabel,
      createdAt: r.createdAt ?? null,
      bankAccountId: r.bankId ?? null,
      bankAccountName: mappedBankAccountName ?? ((r.bank ?? '').trim() || null),
      totalAmount: r.amount ?? 0,
      count: 1,
    };
  });

  return {
    success: true,
    data,
    totalRecords: data.length,
    message: hasMore ? `More than ${MAX_RECORDS} records exist for this range. Showing first ${MAX_RECORDS}.` : undefined,
  };
}

