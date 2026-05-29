'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { RECEIPT_PAYMENT_METHOD } from '@/types/receipt';
import type {
  AgentCollectionReceiptPaymentType,
  AgentCollectionReceiptReportQuery,
  AgentCollectionReceiptReportRow
} from '@/types/reports/agent-collection-receipt';

const MAX_RANGE_DAYS = getReportMaxRangeDays('agent_collection_receipt', 31);
const MAX_RECORDS = getReportMaxRecords('agent_collection_receipt', 20000);
const METHOD_AGENCY_DEPOSIT = 6;
const METHOD_AGENCY_WITHDRAW = 7;

function extractSlipDateFromRemarks(remarks: string | null | undefined): string | null {
  const text = (remarks ?? '').trim();
  if (!text) return null;
  const match = text.match(/(?:^|\|)\s*Slip Date:\s*(\d{4}-\d{2}-\d{2})\s*(?:\||$)/i);
  return match?.[1] ?? null;
}

function parseDateTime(value: string, asEnd: boolean): Date | null {
  return parseReportDateTime(value, asEnd);
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

function mapPaymentTypeToReceiptPaymentMethod(
  paymentType: AgentCollectionReceiptPaymentType | undefined
): number | '__all__' {
  const t = (paymentType ?? '__all__') as AgentCollectionReceiptPaymentType;
  if (t === '__all__') return '__all__';
  if (t === 'cash') return RECEIPT_PAYMENT_METHOD.CASH;
  if (t === 'credit_card') return RECEIPT_PAYMENT_METHOD.CREDIT_CARD;
  if (t === 'slip') return RECEIPT_PAYMENT_METHOD.SLIP;
  if (t === 'cheque') return RECEIPT_PAYMENT_METHOD.CHECK;
  if (t === 'e_wallet') return RECEIPT_PAYMENT_METHOD.E_WALLET;
  return '__all__';
}

export async function getAgentCollectionReceiptReportService(
  query: AgentCollectionReceiptReportQuery
): Promise<{ success: boolean; data: AgentCollectionReceiptReportRow[]; totalRecords: number; message?: string }> {
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

  const locationId = normAll(query.locationId);
  const agencyId = normAll(query.agencyId);
  const pm = mapPaymentTypeToReceiptPaymentMethod(query.paymentType);

  const where: any = {
    bookingId: null,
    method: { in: [METHOD_AGENCY_DEPOSIT, METHOD_AGENCY_WITHDRAW] },
    createdAt: { gte: from, lte: to },
  };
  if (agencyId !== '__all__') where.agencyId = agencyId;
  if (locationId !== '__all__') {
    where.OR = [{ locationId }, { userLocationId: locationId }];
  }

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: [{ createdAt: 'asc' }, { receiptNo: 'asc' }],
    take: MAX_RECORDS + 1,
    select: {
      id: true,
      createdAt: true,
      createdBy: true,
      receiptNoString: true,
      remarks: true,
      agencyId: true,
      agency: { select: { name: true, code: true } },
      cancelReason: true,
      amount: true,
      paymentMethod: true,
      paymentLines: {
        select: { paymentMethod: true, amount: true, slipReference: true, cardReference: true, bank: true },
      },
      slipReference: true,
      cardReference: true,
      bank: true,
      bankId: true,
    },
  });

  const hasMore = receipts.length > MAX_RECORDS;
  const sliced = hasMore ? receipts.slice(0, MAX_RECORDS) : receipts;

  const userIds = Array.from(new Set(sliced.map((r) => r.createdBy).filter((x): x is string => typeof x === 'string' && x.trim() !== '')));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, staff: { select: { code: true } } },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const data: AgentCollectionReceiptReportRow[] = sliced.map((r) => {
    const u = r.createdBy ? userById.get(r.createdBy) ?? null : null;
    const createdUser = u?.name ? formatUserDisplayName(u.name, u.id, u.staff?.code) : null;
    const amt = Number(r.amount ?? 0);
    const lines =
      r.paymentLines.length > 0
        ? r.paymentLines
        : [
            {
              paymentMethod: r.paymentMethod,
              amount: amt,
              slipReference: r.slipReference,
              cardReference: r.cardReference,
              bank: r.bank,
            },
          ]
    const cashAmount = lines
      .filter((line) => line.paymentMethod === RECEIPT_PAYMENT_METHOD.CASH)
      .reduce((sum, line) => sum + line.amount, 0)
    const cardAmount = lines
      .filter((line) => line.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD)
      .reduce((sum, line) => sum + line.amount, 0)
    const slipAmount = lines
      .filter((line) => line.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP)
      .reduce((sum, line) => sum + line.amount, 0)
    const chequeAmount = lines
      .filter((line) => line.paymentMethod === RECEIPT_PAYMENT_METHOD.CHECK)
      .reduce((sum, line) => sum + line.amount, 0)
    const slipRefs = Array.from(
      new Set(
        lines
          .filter((line) => line.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP)
          .map((line) => (line.slipReference ?? "").trim())
          .filter((value) => value.length > 0)
      )
    )
    const cardRefs = Array.from(
      new Set(
        lines
          .filter((line) => line.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD)
          .map((line) => (line.cardReference ?? "").trim())
          .filter((value) => value.length > 0)
      )
    )
    const bankNames = Array.from(
      new Set(
        lines
          .filter(
            (line) =>
              line.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD ||
              line.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP
          )
          .map((line) => (line.bank ?? "").trim())
          .filter((value) => value.length > 0)
      )
    )
    return {
      id: r.id,
      createdAt: r.createdAt,
      createdUser,
      receiptNoString: r.receiptNoString ?? null,
      remarks: (r.remarks ?? '').trim() || null,
      agencyName: (r.agency?.name ?? '').trim() || null,
      agencyCode: r.agency?.code ?? null,
      cancelReason: (r.cancelReason ?? '').trim() || null,
      receiptAmount: amt,
      cashAmount,
      cardAmount,
      chequeAmount,
      slipAmount,
      slipRef:
        slipRefs.length > 0
          ? slipRefs.join(", ")
          : (r.slipReference ?? "").trim() || null,
      slipDate: extractSlipDateFromRemarks(r.remarks),
      cardRef:
        cardRefs.length > 0
          ? cardRefs.join(", ")
          : (r.cardReference ?? "").trim() || null,
      bankName:
        bankNames.length > 0
          ? bankNames.join(", ")
          : (r.bank ?? "").trim() || null,
    };
  }).filter((row) => {
    if (pm === '__all__') return true
    if (pm === RECEIPT_PAYMENT_METHOD.CASH) return row.cashAmount > 0
    if (pm === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) return row.cardAmount > 0
    if (pm === RECEIPT_PAYMENT_METHOD.SLIP) return row.slipAmount > 0
    if (pm === RECEIPT_PAYMENT_METHOD.CHECK) return row.chequeAmount > 0
    return true
  });

  return {
    success: true,
    data,
    totalRecords: data.length,
    message: hasMore ? `More than ${MAX_RECORDS} records exist for this range. Showing first ${MAX_RECORDS}.` : undefined,
  };
}

