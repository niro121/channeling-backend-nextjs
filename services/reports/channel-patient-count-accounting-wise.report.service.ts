'use server';

import prisma from '@/lib/prisma';
import {
  bookingHasNoPaymentReceipt,
  bookingHasNoPaymentReceiptWhere,
  bookingHasPaymentReceiptWhere,
  isUnpaidCancelEventInRange,
} from '@/lib/reports/booking-payment-receipt';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { RECEIPT_PAYMENT_METHOD } from '@/types/receipt';
import type {
  ChannelPatientCountAccountingWiseQuery,
  ChannelPatientCountAccountingWiseResult,
  ChannelPatientCountAccountingWiseRow,
} from '@/types/reports/channel-patient-count-accounting-wise';

const MAX_RANGE_DAYS = getReportMaxRangeDays('channel_patient_count_accounting_wise', 62);
const MAX_BOOKINGS_SCAN = getReportMaxRecords('channel_patient_count_accounting_wise', 50000);

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

/** Booking.method: 0 POS, 1 On-Call, 2 Agent, 3 Staff, 4 API — API has no row; map to Agent for reporting. */
function normalizeChannelMethod(method: unknown): number {
  const m = Number(method);
  if (!Number.isFinite(m)) return 0;
  if (m === 4) return 2;
  return m;
}

function resolveBucket(booking: {
  method: unknown;
  isScan: boolean;
  receiptPaymentMethod: number | null;
}): BucketDef | undefined {
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

function makeEmptyRow(key: string, bookingType: string): ChannelPatientCountAccountingWiseRow {
  return {
    key,
    bookingType,
    paidBillPaid: 0,
    paidBillPending: 0,
    paidBillNet: 0,
    cancelBillPaid: 0,
    cancelBillPending: 0,
    cancelBillNet: 0,
    refundBillHos: 0,
    refundBillPro: 0,
    totalCountPaid: 0,
    totalCountPending: 0,
    totalCountNet: 0,
    paidRevenueHosFee: 0,
    paidRevenueHosDis: 0,
    paidRevenueProFee: 0,
    paidRevenueProDis: 0,
    paidRevenueTotal: 0,
    cancelRevenueHosFee: 0,
    cancelRevenueHosDis: 0,
    cancelRevenueProFee: 0,
    cancelRevenueProDis: 0,
    cancelRevenueTotal: 0,
    refundRevenueHosRefund: 0,
    refundRevenueProRefund: 0,
    nettRevenueHosFee: 0,
    nettRevenueHosDis: 0,
    nettRevenueProFee: 0,
    nettRevenueProDis: 0,
    nettRevenueTotal: 0,
    pendingRevenueHosFee: 0,
    pendingRevenueProFee: 0,
  };
}

function addRowInto(target: ChannelPatientCountAccountingWiseRow, row: ChannelPatientCountAccountingWiseRow) {
  target.paidBillPaid += row.paidBillPaid;
  target.paidBillPending += row.paidBillPending;
  target.paidBillNet += row.paidBillNet;
  target.cancelBillPaid += row.cancelBillPaid;
  target.cancelBillPending += row.cancelBillPending;
  target.cancelBillNet += row.cancelBillNet;
  target.refundBillHos += row.refundBillHos;
  target.refundBillPro += row.refundBillPro;
  target.totalCountPaid += row.totalCountPaid;
  target.totalCountPending += row.totalCountPending;
  target.totalCountNet += row.totalCountNet;
  target.paidRevenueHosFee += row.paidRevenueHosFee;
  target.paidRevenueHosDis += row.paidRevenueHosDis;
  target.paidRevenueProFee += row.paidRevenueProFee;
  target.paidRevenueProDis += row.paidRevenueProDis;
  target.paidRevenueTotal += row.paidRevenueTotal;
  target.cancelRevenueHosFee += row.cancelRevenueHosFee;
  target.cancelRevenueHosDis += row.cancelRevenueHosDis;
  target.cancelRevenueProFee += row.cancelRevenueProFee;
  target.cancelRevenueProDis += row.cancelRevenueProDis;
  target.cancelRevenueTotal += row.cancelRevenueTotal;
  target.refundRevenueHosRefund += row.refundRevenueHosRefund;
  target.refundRevenueProRefund += row.refundRevenueProRefund;
  target.nettRevenueHosFee += row.nettRevenueHosFee;
  target.nettRevenueHosDis += row.nettRevenueHosDis;
  target.nettRevenueProFee += row.nettRevenueProFee;
  target.nettRevenueProDis += row.nettRevenueProDis;
  target.nettRevenueTotal += row.nettRevenueTotal;
  target.pendingRevenueHosFee += row.pendingRevenueHosFee;
  target.pendingRevenueProFee += row.pendingRevenueProFee;
}

function isWithinRange(date: Date | null | undefined, from: Date, to: Date): boolean {
  if (!date) return false;
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export async function getChannelPatientCountAccountingWiseService(
  query: ChannelPatientCountAccountingWiseQuery
): Promise<ChannelPatientCountAccountingWiseResult> {
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
     * Unpaid cancellations (no payment receipt): not keyed by receiptNoCreatedAt.
     * Use updatedAt in range so the row is included when the cancel runs (Prisma @updatedAt) — Mongo often
     * does not match `{ canceledAt: null }` when the field is omitted, and legacy rows lack canceledAt.
     */
    const unpaidCancelInTransactionWindow = {
      AND: [
        { status: 2 },
        bookingHasNoPaymentReceiptWhere(),
        {
          OR: [
            { canceledAt: { gte: from, lte: to } },
            { updatedAt: { gte: from, lte: to } },
          ],
        },
      ],
    };

    const bookingWhere =
      dateType === 'transaction_date'
        ? {
            OR: [
              { status: 0, createdAt: { gte: from, lte: to } },
              {
                AND: [
                  bookingHasPaymentReceiptWhere(),
                  { receiptNoCreatedAt: { gte: from, lte: to } },
                ],
              },
              {
                AND: [
                  { refund: { in: [1, 2, 3] } },
                  { refundReceiptCreatedAt: { gte: from, lte: to } },
                ],
              },
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
        id: true,
        method: true,
        isScan: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        canceledAt: true,
        receiptNoString: true,
        receiptNoCreatedAt: true,
        refundReceiptCreatedAt: true,
        refund: true,
        hospitalFee: true,
        hospitalFeeDiscount: true,
        professionalFee: true,
        professionsalFeeDiscount: true,
        refundAmountHospitalFee: true,
        refundAmountProfessionalFee: true,
        receiptPaymentMethod: true,
      },
    });

    const rowsByBucket = new Map(BUCKETS.map((b) => [b.key, makeEmptyRow(b.key, b.label)]));

    const includeHos = query.feeMode !== 'professional_fee_only';
    const includePro = query.feeMode !== 'hospital_fee_only';

    for (const b of bookings) {
      const bucket = resolveBucket({
        method: b.method,
        isScan: Boolean(b.isScan),
        receiptPaymentMethod: b.receiptPaymentMethod ?? null,
      });
      if (!bucket) continue;
      const row = rowsByBucket.get(bucket.key);
      if (!row) continue;

      const isPending = b.status === 0;
      const paidBeforeCancel = !bookingHasNoPaymentReceipt(b.receiptNoString);
      const refundType = Number(b.refund ?? 0);
      const isFullCancel = b.status === 2 && refundType === 3;
      const isPendingCancel = b.status === 2 && !paidBeforeCancel;
      // Partial refunds (prof-only=1, hosp-only=2) are only possible when a paid receipt exists.
      const isPartialRefund = paidBeforeCancel && (refundType === 1 || refundType === 2);

      const pendingInTransactionWindow = isPending && isWithinRange(b.createdAt, from, to);
      const paidInTransactionWindow = paidBeforeCancel && isWithinRange(b.receiptNoCreatedAt, from, to);
      const refundInTransactionWindow = isPartialRefund && isWithinRange(b.refundReceiptCreatedAt, from, to);
      const fullCancelInTransactionWindow = isFullCancel && isWithinRange(b.refundReceiptCreatedAt, from, to);
      const pendingCancelInTransactionWindow =
        isPendingCancel && isUnpaidCancelEventInRange(b.canceledAt, b.updatedAt, from, to);

      const countPaid = dateType === 'transaction_date' ? paidInTransactionWindow : paidBeforeCancel;
      const countPending = dateType === 'transaction_date' ? pendingInTransactionWindow : isPending;
      const countCancelPaid = dateType === 'transaction_date' ? fullCancelInTransactionWindow : isFullCancel && paidBeforeCancel;
      const countCancelPending = dateType === 'transaction_date' ? pendingCancelInTransactionWindow : isPendingCancel;
      const countRefundHos =
        dateType === 'transaction_date'
          ? refundInTransactionWindow && refundType === 2
          : isPartialRefund && refundType === 2;
      const countRefundPro =
        dateType === 'transaction_date'
          ? refundInTransactionWindow && refundType === 1
          : isPartialRefund && refundType === 1;

      // Receipt-based counts:
      // - Paid bill count = number of payment receipts (receiptNoString exists), regardless of later cancel/refund.
      row.paidBillPaid += countPaid ? 1 : 0;
      row.paidBillPending += countPending ? 1 : 0;
      row.paidBillNet = row.paidBillPaid + row.paidBillPending;

      // Cancel bill count:
      // - Paid cancel = full cancel (refund=3) with an original paid receipt.
      // - Pending cancel = canceled booking without any paid receipt.
      row.cancelBillPaid += countCancelPaid ? 1 : 0;
      row.cancelBillPending += countCancelPending ? 1 : 0;
      row.cancelBillNet = row.cancelBillPaid + row.cancelBillPending;

      // Refund bill count should not include canceled bookings (full cancel is handled in Cancel Bill Count).
      row.refundBillHos += countRefundHos ? 1 : 0;
      row.refundBillPro += countRefundPro ? 1 : 0;

      row.totalCountPaid = row.paidBillPaid - row.cancelBillPaid;
      // Still-open pendings (status 0) only. Do not subtract cancelBillPending: those bookings are no longer
      // status 0, so they were never in paidBillPending — subtracting would yield negative totals (e.g. -1).
      row.totalCountPending = row.paidBillPending;
      row.totalCountNet = row.totalCountPaid + row.totalCountPending;

      const hosFee = includeHos ? Number(b.hospitalFee ?? 0) : 0;
      const hosDis = includeHos ? Number(b.hospitalFeeDiscount ?? 0) : 0;
      const proFee = includePro ? Number(b.professionalFee ?? 0) : 0;
      const proDis = includePro ? Number(b.professionsalFeeDiscount ?? 0) : 0;
      const hosRefund = includeHos ? Number(b.refundAmountHospitalFee ?? 0) : 0;
      const proRefund = includePro ? Number(b.refundAmountProfessionalFee ?? 0) : 0;

      // Revenue flow:
      // 1) Any booking with a paid receipt contributes to Paid Revenue first.
      // 2) If that paid booking was fully canceled, the same values are added to Cancel Revenue
      //    so Nett Revenue correctly reflects the reversal once (Paid - Cancel - Refund).
      if (countPaid) {
        row.paidRevenueHosFee += hosFee;
        row.paidRevenueHosDis += hosDis;
        row.paidRevenueProFee += proFee;
        row.paidRevenueProDis += proDis;
      } else if (countPending) {
        // Pending revenue (no receipt yet): use net fee (fee - discount) for visibility.
        row.pendingRevenueHosFee += Math.max(0, hosFee - hosDis);
        row.pendingRevenueProFee += Math.max(0, proFee - proDis);
      }
      if (countCancelPaid) {
        row.cancelRevenueHosFee += hosFee;
        row.cancelRevenueHosDis += hosDis;
        row.cancelRevenueProFee += proFee;
        row.cancelRevenueProDis += proDis;
      }
      // Refund revenue should exclude full cancels (refund=3) since those are treated as Cancel above.
      if (dateType === 'transaction_date' ? refundInTransactionWindow : isPartialRefund) {
        row.refundRevenueHosRefund += hosRefund;
        row.refundRevenueProRefund += proRefund;
      }

      // "Hos Total" columns: hospital net (fee − discount) only; professional is in Pro Fee / Pro Dis.
      row.paidRevenueTotal = row.paidRevenueHosFee - row.paidRevenueHosDis;
      row.cancelRevenueTotal = row.cancelRevenueHosFee - row.cancelRevenueHosDis;

      row.nettRevenueHosFee = row.paidRevenueHosFee - row.cancelRevenueHosFee - row.refundRevenueHosRefund;
      row.nettRevenueHosDis = row.paidRevenueHosDis - row.cancelRevenueHosDis;
      row.nettRevenueProFee = row.paidRevenueProFee - row.cancelRevenueProFee - row.refundRevenueProRefund;
      row.nettRevenueProDis = row.paidRevenueProDis - row.cancelRevenueProDis;
      row.nettRevenueTotal = row.nettRevenueHosFee - row.nettRevenueHosDis;
    }

    const data = BUCKETS.map((b) => rowsByBucket.get(b.key) || makeEmptyRow(b.key, b.label));
    const totals = makeEmptyRow('total', 'Total');
    for (const row of data) addRowInto(totals, row);

    return {
      success: true,
      data,
      totals,
      totalRecords: data.length,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch channel patient count report';
    console.error('getChannelPatientCountAccountingWiseService error:', error);
    return { success: false, message: msg };
  }
}

