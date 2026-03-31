'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { RECEIPT_PAYMENT_METHOD } from '@/types/receipt';
import type {
  ChannelIncomeAccountingWiseQuery,
  ChannelIncomeAccountingWiseResult,
  ChannelIncomeAccountingWiseRow,
} from '@/types/reports/channel-income-accounting-wise';

const MAX_RANGE_DAYS = getReportMaxRangeDays('channel_income_accounting_wise', 62);
const MAX_BOOKINGS_SCAN = getReportMaxRecords('channel_income_accounting_wise', 50000);

function parseDateTime(input?: string, asEnd = false): Date | null {
  const v = input?.trim();
  if (!v) return null;
  if (v.includes('T')) {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const [y, m, d] = v.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return asEnd ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
}

type BucketDef = { key: string; label: string; method: number; isScan: boolean };
// NOTE: Excludes API and PCR-related booking types; also excludes ONLINE.
/** Display order: all Channel buckets, then all Scan (method order within each group). */
const BUCKETS: BucketDef[] = [
  { key: 'channel_pos', label: 'Channel POS', method: 0, isScan: false },
  { key: 'channel_on_call', label: 'Channel On-Call', method: 1, isScan: false },
  { key: 'channel_agent', label: 'Channel Agent', method: 2, isScan: false },
  { key: 'channel_staff', label: 'Channel Staff', method: 3, isScan: false },
  { key: 'channel_ewallet', label: 'Channel E-Wallet', method: -1, isScan: false },
  { key: 'channel_credit_customer', label: 'Channel Credit Customer', method: -1, isScan: false },
  { key: 'scan_pos', label: 'Scan POS', method: 0, isScan: true },
  { key: 'scan_on_call', label: 'Scan On-Call', method: 1, isScan: true },
  { key: 'scan_agent', label: 'Scan Agent', method: 2, isScan: true },
  { key: 'scan_staff', label: 'Scan Staff', method: 3, isScan: true },
  { key: 'scan_ewallet', label: 'Scan E-Wallet', method: -1, isScan: true },
  { key: 'scan_credit_customer', label: 'Scan Credit Customer', method: -1, isScan: true },
];

/** Booking.method: 0 POS, 1 On-Call, 2 Agent, 3 Staff, 4 API — map API to Agent for reporting buckets. */
function normalizeChannelMethod(method: unknown): number {
  const m = Number(method);
  if (!Number.isFinite(m)) return 0;
  if (m === 4) return 2;
  return m;
}

function resolveBucket(booking: { method: unknown; isScan: boolean; receiptPaymentMethod: number | null }): BucketDef | undefined {
  const channelMethod = normalizeChannelMethod(booking.method);
  const pm = booking.receiptPaymentMethod;
  if (pm === RECEIPT_PAYMENT_METHOD.E_WALLET) {
    return BUCKETS.find((b) => b.key === (booking.isScan ? 'scan_ewallet' : 'channel_ewallet'));
  }
  if (pm === RECEIPT_PAYMENT_METHOD.CREDIT) {
    return BUCKETS.find((b) => b.key === (booking.isScan ? 'scan_credit_customer' : 'channel_credit_customer'));
  }
  return BUCKETS.find((x) => x.method === channelMethod && x.isScan === Boolean(booking.isScan));
}

function makeEmptyRow(key: string, bookingType: string): ChannelIncomeAccountingWiseRow {
  return {
    key,
    bookingType,
    totalChannel: 0,
    discount: 0,
    cancel: 0,
    refund: 0,
    nettAmount: 0,
  };
}

function addRowInto(target: ChannelIncomeAccountingWiseRow, row: ChannelIncomeAccountingWiseRow) {
  target.totalChannel += row.totalChannel;
  target.discount += row.discount;
  target.cancel += row.cancel;
  target.refund += row.refund;
  target.nettAmount += row.nettAmount;
}

export async function getChannelIncomeAccountingWiseService(
  query: ChannelIncomeAccountingWiseQuery
): Promise<ChannelIncomeAccountingWiseResult> {
  try {
    const from = parseDateTime(query.fromDateTime, false);
    const to = parseDateTime(query.toDateTime, true);
    if (!from || !to) return { success: false, message: 'From and To date/time are required.' };
    if (from.getTime() > to.getTime()) return { success: false, message: 'From date/time must be before or equal to To date/time.' };

    const daySpan = getInclusiveDaySpan(from, to);
    if (daySpan > MAX_RANGE_DAYS) {
      return { success: false, message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` };
    }

    const dateType = query.dateType === 'session_date' ? 'session_date' : 'transaction_date';
    /**
     * Unpaid cancellations: key off updatedAt (cancel bumps it); avoids Mongo null/missing canceledAt issues.
     */
    const unpaidCancelInTransactionWindow = {
      AND: [
        { status: 2 },
        {
          OR: [{ receiptNoString: null }, { receiptNoString: '' }],
        },
        { updatedAt: { gte: from, lte: to } },
      ],
    };

    const bookingWhere =
      dateType === 'transaction_date'
        ? {
            OR: [
              { status: 0, createdAt: { gte: from, lte: to } },
              { status: { in: [1, 2, 3] }, receiptNoCreatedAt: { gte: from, lte: to } },
              unpaidCancelInTransactionWindow,
            ],
            ...(query.locationId && query.locationId !== '__all__' ? { locationId: query.locationId } : {}),
          }
        : {
            session: {
              is: {
                date: { gte: from, lte: to },
                ...(query.locationId && query.locationId !== '__all__' ? { locationId: query.locationId } : {}),
              },
            },
          };

    const matchedBookingCount = await prisma.booking.count({ where: bookingWhere });
    if (matchedBookingCount > MAX_BOOKINGS_SCAN) {
      return {
        success: false,
        message: `Too many records in selected range (${matchedBookingCount}). Please narrow filters/date range.`,
      };
    }

    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      select: {
        method: true,
        isScan: true,
        status: true,
        receiptNoString: true,
        receiptPaymentMethod: true,
        refund: true,
        hospitalFee: true,
        hospitalFeeDiscount: true,
        professionalFee: true,
        professionsalFeeDiscount: true,
        refundAmountHospitalFee: true,
        refundAmountProfessionalFee: true,
      },
    });

    const includeHos = query.feeMode !== 'professional_fee_only';
    const includePro = query.feeMode !== 'hospital_fee_only';

    const rowsByBucket = new Map(BUCKETS.map((b) => [b.key, makeEmptyRow(b.key, b.label)]));

    for (const b of bookings) {
      const bucket = resolveBucket({
        method: b.method,
        isScan: Boolean(b.isScan),
        receiptPaymentMethod: b.receiptPaymentMethod ?? null,
      });
      if (!bucket) continue;
      const row = rowsByBucket.get(bucket.key);
      if (!row) continue;

      const paidReceiptExists = Boolean(b.receiptNoString?.trim());
      const refundType = Number(b.refund ?? 0);
      const isFullCancel = b.status === 2 && refundType === 3 && paidReceiptExists;
      const isPartialRefund = paidReceiptExists && (refundType === 1 || refundType === 2);

      const hosFee = includeHos ? Number(b.hospitalFee ?? 0) : 0;
      const hosDis = includeHos ? Number(b.hospitalFeeDiscount ?? 0) : 0;
      const proFee = includePro ? Number(b.professionalFee ?? 0) : 0;
      const proDis = includePro ? Number(b.professionsalFeeDiscount ?? 0) : 0;

      // Receipt-based: Total channel/discount are driven by the existence of a payment receipt.
      if (paidReceiptExists) {
        row.totalChannel += hosFee + proFee;
        row.discount += hosDis + proDis;
      }

      // Cancel / Refund amounts are driven by refunded amounts (in Rs), stored positive in booking.
      const hosRefund = includeHos ? Number(b.refundAmountHospitalFee ?? 0) : 0;
      const proRefund = includePro ? Number(b.refundAmountProfessionalFee ?? 0) : 0;

      if (isFullCancel) {
        row.cancel -= hosRefund + proRefund;
      } else if (isPartialRefund) {
        // Refund column should not include full cancels.
        row.refund -= hosRefund + proRefund;
      }

      row.nettAmount = row.totalChannel - row.discount + row.cancel + row.refund;
    }

    const data = BUCKETS.map((b) => rowsByBucket.get(b.key) || makeEmptyRow(b.key, b.label));
    const totals = makeEmptyRow('total', 'Total');
    for (const r of data) addRowInto(totals, r);

    return { success: true, data, totals, totalRecords: data.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch channel income report';
    console.error('getChannelIncomeAccountingWiseService error:', error);
    return { success: false, message: msg };
  }
}

