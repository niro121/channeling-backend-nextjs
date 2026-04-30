'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import type { CardSummaryBankWiseReportQuery, CardSummaryBankWiseReportRow } from '@/types/reports/card-summary-bank-wise';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';

const MAX_RANGE_DAYS = getReportMaxRangeDays('card_summary_bank_wise', 31);
const MAX_RECORDS = getReportMaxRecords('card_summary_bank_wise', 20000);
const CARD_PAYMENT_METHOD = 1; // Receipt.paymentMethod: 1 = Credit Card

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

type CardLineLike = {
  amount: number | null | undefined;
  bankId?: string | null;
  bank?: string | null;
  cardReference?: string | null;
};

function getCardLinesForReceipt<T extends {
  paymentLines: CardLineLike[];
  paymentMethod?: number | null;
  amount?: number | null;
  bankId?: string | null;
  bank?: string | null;
  cardReference?: string | null;
}>(receipt: T): CardLineLike[] {
  if (receipt.paymentLines.length > 0) {
    return receipt.paymentLines.filter((line) => line.paymentMethod === CARD_PAYMENT_METHOD);
  }
  return receipt.paymentMethod === CARD_PAYMENT_METHOD
    ? [
        {
          amount: receipt.amount ?? 0,
          bankId: receipt.bankId ?? null,
          bank: receipt.bank ?? '',
          cardReference: receipt.cardReference ?? '',
        },
      ]
    : [];
}

export async function getCardSummaryBankWiseReportService(
  query: CardSummaryBankWiseReportQuery
): Promise<{ success: boolean; data: CardSummaryBankWiseReportRow[]; totalRecords: number; message?: string }> {
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
    return { success: false, data: [], totalRecords: 0, message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` };
  }

  const bankId = normAll(query.bankId);
  const locationId = normAll(query.locationId);
  const isSummary = query.format === 'summary';

  const where: any = {
    createdAt: { gte: from, lte: to },
  };
  if (locationId !== '__all__') {
    where.AND = [{ OR: [{ locationId }, { userLocationId: locationId }] }];
  }

  if (isSummary) {
    const receipts = await prisma.receipt.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { receiptNo: 'asc' }],
      take: MAX_RECORDS + 1,
      select: {
        id: true,
        bankId: true,
        bank: true,
        amount: true,
        paymentMethod: true,
        paymentLines: {
          select: { paymentMethod: true, amount: true, bankId: true, bank: true },
        },
      },
    });
    const hasMore = receipts.length > MAX_RECORDS;
    const sliced = hasMore ? receipts.slice(0, MAX_RECORDS) : receipts;
    const totalsByBank = new Map<string | null, { totalAmount: number; count: number }>();
    for (const receipt of sliced) {
      const cardLines = getCardLinesForReceipt(receipt);
      if (cardLines.length === 0) continue;
      const byBank = new Map<string | null, number>();
      for (const line of cardLines) {
        const key = line.bankId ?? receipt.bankId ?? null;
        byBank.set(key, (byBank.get(key) ?? 0) + Number(line.amount ?? 0));
      }
      for (const [key, bankTotal] of byBank.entries()) {
        if (bankId !== '__all__' && key !== bankId) continue;
        const current = totalsByBank.get(key) ?? { totalAmount: 0, count: 0 };
        current.totalAmount += bankTotal;
        current.count += 1;
        totalsByBank.set(key, current);
      }
    }

    const bankIds = Array.from(
      new Set(Array.from(totalsByBank.keys()).filter((x): x is string => typeof x === 'string' && x.trim() !== ''))
    );
    const banks = bankIds.length
      ? await prisma.tag.findMany({ where: { id: { in: bankIds } }, select: { id: true, name: true } })
      : [];
    const bankById = new Map(banks.map((b) => [b.id, (b.name ?? '').trim()]));

    const data: CardSummaryBankWiseReportRow[] = Array.from(totalsByBank.entries()).map(([bid, totals]) => {
      const bankName = bid ? bankById.get(bid) ?? null : null;
      return {
        id: bid ?? '__no_bank__',
        bankId: bid,
        bankName,
        totalAmount: totals.totalAmount,
        count: totals.count,
      };
    });

    // Sort by bank name for nicer UX, keep null last.
    data.sort((a, b) => {
      const an = (a.bankName ?? '').toLowerCase();
      const bn = (b.bankName ?? '').toLowerCase();
      if (!an && bn) return 1;
      if (an && !bn) return -1;
      return an.localeCompare(bn);
    });

    return {
      success: true,
      data,
      totalRecords: data.length,
      message: hasMore ? `More than ${MAX_RECORDS} records exist for this range. Showing first ${MAX_RECORDS}.` : undefined,
    };
  }

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: [{ createdAt: 'asc' }, { receiptNo: 'asc' }],
    take: MAX_RECORDS + 1,
    select: {
      id: true,
      bankId: true,
      bank: true,
      cardReference: true,
      remarks: true,
      amount: true,
      paymentMethod: true,
      paymentLines: {
        select: { paymentMethod: true, amount: true, bank: true, bankId: true, cardReference: true },
      },
      receiptNoString: true,
      createdAt: true,
      locationId: true,
      userLocationId: true,
      createdBy: true,
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

  const [locations, users] = await Promise.all([
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
  ]);
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const data: CardSummaryBankWiseReportRow[] = []
  for (const r of sliced) {
    const cardLines = getCardLinesForReceipt(r)
    if (cardLines.length === 0) continue
    const byBank = new Map<string | null, { totalAmount: number; cardRefs: Set<string>; bankNames: Set<string> }>()
    for (const line of cardLines) {
      const key = line.bankId ?? r.bankId ?? null
      const current = byBank.get(key) ?? { totalAmount: 0, cardRefs: new Set<string>(), bankNames: new Set<string>() }
      current.totalAmount += Number(line.amount ?? 0)
      const cardRef = (line.cardReference ?? '').trim()
      if (cardRef) current.cardRefs.add(cardRef)
      const bankName = (line.bank ?? '').trim()
      if (bankName) current.bankNames.add(bankName)
      byBank.set(key, current)
    }
    const userLocId = r.userLocationId ?? r.locationId ?? null;
    const loc = userLocId ? locationById.get(userLocId) ?? null : null;
    const userLocationLabel = loc?.name ? `${loc.name}${loc.code ? ` (${loc.code})` : ''}` : null;
    const u = r.createdBy ? userById.get(r.createdBy) ?? null : null;
    const userLabel = u?.name ? formatUserDisplayName(u.name, u.id, u.staff?.code) : null;
    for (const [lineBankId, bucket] of byBank.entries()) {
      if (bankId !== '__all__' && lineBankId !== bankId) continue
      const lineBankNames = Array.from(bucket.bankNames)
      const lineCardRefs = Array.from(bucket.cardRefs)
      data.push({
        id: `${r.id}:${lineBankId ?? '__no_bank__'}`,
        bankId: lineBankId,
        bankName: lineBankNames.length > 0 ? lineBankNames.join(', ') : (r.bank ?? '').trim() || null,
        totalAmount: bucket.totalAmount,
        count: 1,
        receiptNoString: r.receiptNoString ?? null,
        createdAt: r.createdAt ?? null,
        userLocation: userLocationLabel,
        user: userLabel,
        cardReference:
          lineCardRefs.length > 0 ? lineCardRefs.join(', ') : (r.cardReference ?? '').trim() || null,
        remarks: (r.remarks ?? '').trim() || null,
      })
    }
  }

  return {
    success: true,
    data,
    totalRecords: data.length,
    message: hasMore ? `More than ${MAX_RECORDS} records exist for this range. Showing first ${MAX_RECORDS}.` : undefined,
  };
}

