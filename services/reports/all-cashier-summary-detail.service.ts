'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { RECEIPT_METHOD, RECEIPT_PAYMENT_METHOD } from '@/types/receipt';
import type {
  AllCashierSummaryDetailReportQuery,
  AllCashierSummaryDetailReportResponse,
  AllCashierUserSummaryRow,
  AllCashierUserDetailRow,
  CashierSummaryPaymentAmounts,
} from '@/types/report';
import type { Prisma } from '@prisma/client';

const ZERO_AMOUNTS: CashierSummaryPaymentAmounts = {
  cash: 0,
  creditCard: 0,
  slip: 0,
  cheque: 0,
  agent: 0,
  agentCredit: 0,
  eWallet: 0,
};

const MAX_RANGE_DAYS = getReportMaxRangeDays('all_cashier_summary_detail', getReportMaxRangeDays('cashier_summary', 62));
const MAX_RECEIPTS_SCAN = getReportMaxRecords('all_cashier_summary_detail', getReportMaxRecords('cashier_summary', 50000));

function parseDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = value?.trim();
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

function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseDateTime(dateFrom, false);
  const end = parseDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
}

function paymentColumnKey(paymentMethod: number): keyof CashierSummaryPaymentAmounts {
  const map: Record<number, keyof CashierSummaryPaymentAmounts> = {
    [RECEIPT_PAYMENT_METHOD.CASH]: 'cash',
    [RECEIPT_PAYMENT_METHOD.CREDIT_CARD]: 'creditCard',
    [RECEIPT_PAYMENT_METHOD.SLIP]: 'slip',
    [RECEIPT_PAYMENT_METHOD.CHECK]: 'cheque',
    [RECEIPT_PAYMENT_METHOD.AGENT]: 'agent',
    [RECEIPT_PAYMENT_METHOD.CREDIT]: 'agentCredit',
    [RECEIPT_PAYMENT_METHOD.E_WALLET]: 'eWallet',
  };
  return map[paymentMethod] ?? 'cash';
}

function receiptToAmounts(paymentMethod: number, amount: number, type: number): CashierSummaryPaymentAmounts {
  const key = paymentColumnKey(paymentMethod);
  const value = type === 0 ? -Math.abs(amount) : amount;
  return { ...ZERO_AMOUNTS, [key]: value };
}

function addAmounts(a: CashierSummaryPaymentAmounts, b: CashierSummaryPaymentAmounts): CashierSummaryPaymentAmounts {
  return {
    cash: a.cash + b.cash,
    creditCard: a.creditCard + b.creditCard,
    slip: a.slip + b.slip,
    cheque: a.cheque + b.cheque,
    agent: a.agent + b.agent,
    agentCredit: a.agentCredit + b.agentCredit,
    eWallet: a.eWallet + b.eWallet,
  };
}

function sectionKeyFromReceipt(r: {
  method: number;
  bookingId: string | null;
  agencyId: string | null;
  booking?: { status: number; refund: number } | null;
}): { key: string; title: string } {
  if (r.method === RECEIPT_METHOD.PAYMENT && r.bookingId && !r.agencyId) {
    return { key: 'channelBilled', title: 'Channel Billed Bills' };
  }
  if (r.method === RECEIPT_METHOD.REFUND && r.bookingId && !r.agencyId) {
    if (r.booking?.refund === 3 && r.booking?.status === 2) {
      return { key: 'channelCancel', title: 'Channel Cancel Bills' };
    }
    return { key: 'channelRefund', title: 'Channel Refund Bills' };
  }
  if (r.agencyId && r.method === RECEIPT_METHOD.PAYMENT) {
    return { key: 'agentBilled', title: 'Agent - Billed Bills' };
  }
  if (r.agencyId && r.method === RECEIPT_METHOD.REFUND) {
    if (r.booking?.refund === 3 && r.booking?.status === 2) {
      return { key: 'agentCanceled', title: 'Agent - Canceled Bills' };
    }
    return { key: 'agentRefunded', title: 'Agent - Refunded Bills' };
  }
  if (r.method === RECEIPT_METHOD.AGENCY_DEPOSIT) {
    return { key: 'agentDeposit', title: 'Agent - Deposit Bills' };
  }
  if (r.method === RECEIPT_METHOD.DOCTOR_PAYMENT || r.method === RECEIPT_METHOD.DOCTOR_CANCEL) {
    return { key: 'doctorPayment', title: 'Doctor Payment / Canceled - Bills' };
  }
  if (r.method === RECEIPT_METHOD.BRANCH_INCOME || r.method === RECEIPT_METHOD.BRANCH_EXPENSE) {
    return { key: 'incomeExpense', title: 'Income / Expenses - Bills' };
  }
  return { key: 'other', title: 'Other Receipts' };
}

export async function getAllCashierSummaryDetailReportService(
  query: AllCashierSummaryDetailReportQuery
): Promise<AllCashierSummaryDetailReportResponse> {
  const range = parseFromTo(query.dateFrom, query.dateTo);
  if (!range) {
    return { success: false, summaryRows: [], detailRows: [], grandTotals: ZERO_AMOUNTS, totalReceipts: 0, message: 'From date and to date are required.' };
  }
  const { start: from, end: to } = range;
  if (from.getTime() > to.getTime()) {
    return { success: false, summaryRows: [], detailRows: [], grandTotals: ZERO_AMOUNTS, totalReceipts: 0, message: 'From date/time must be before or equal to to date/time.' };
  }
  const daySpan = getInclusiveDaySpan(from, to);
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      summaryRows: [],
      detailRows: [],
      grandTotals: ZERO_AMOUNTS,
      totalReceipts: 0,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  const baseWhere: Prisma.ReceiptWhereInput = {
    createdAt: { gte: from, lte: to },
  };
  if (query.userId && query.userId !== '__all__') {
    baseWhere.createdBy = query.userId;
  }
  if (query.locationId && query.locationId !== '__all__') {
    baseWhere.OR = [{ locationId: query.locationId }, { userLocationId: query.locationId }];
  }

  const matchedReceiptCount = await prisma.receipt.count({ where: baseWhere });
  if (matchedReceiptCount > MAX_RECEIPTS_SCAN) {
    return {
      success: false,
      summaryRows: [],
      detailRows: [],
      grandTotals: ZERO_AMOUNTS,
      totalReceipts: 0,
      message: `Too many records in selected range (${matchedReceiptCount}). Please narrow filters/date range.`,
    };
  }

  const receipts = await prisma.receipt.findMany({
    where: baseWhere,
    select: {
      id: true,
      createdBy: true,
      paymentMethod: true,
      amount: true,
      type: true,
      method: true,
      bookingId: true,
      agencyId: true,
      booking: { select: { status: true, refund: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const userIds = Array.from(new Set(receipts.map((r) => r.createdBy).filter(Boolean))) as string[];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, staff: { select: { code: true } } },
      })
    : [];
  const userNameMap = new Map(
    users.map((u) => {
      return [u.id, formatUserDisplayName(u.name, u.id, u.staff?.code)];
    })
  );

  const byUser = new Map<
    string,
    {
      userId: string;
      userName: string;
      receiptCount: number;
      totals: CashierSummaryPaymentAmounts;
      sections: Map<string, { key: string; title: string; receiptCount: number; totals: CashierSummaryPaymentAmounts }>;
    }
  >();

  let grandTotals = { ...ZERO_AMOUNTS };
  let totalReceipts = 0;

  for (const r of receipts) {
    const userId = r.createdBy || '__unknown__';
    const userName = userNameMap.get(userId) || 'Unknown user';
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        userId,
        userName,
        receiptCount: 0,
        totals: { ...ZERO_AMOUNTS },
        sections: new Map(),
      });
    }
    const entry = byUser.get(userId)!;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    const section = sectionKeyFromReceipt(r);

    entry.receiptCount += 1;
    entry.totals = addAmounts(entry.totals, amounts);

    if (!entry.sections.has(section.key)) {
      entry.sections.set(section.key, { key: section.key, title: section.title, receiptCount: 0, totals: { ...ZERO_AMOUNTS } });
    }
    const sec = entry.sections.get(section.key)!;
    sec.receiptCount += 1;
    sec.totals = addAmounts(sec.totals, amounts);

    grandTotals = addAmounts(grandTotals, amounts);
    totalReceipts += 1;
  }

  const sortedUsers = Array.from(byUser.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  const summaryRows: AllCashierUserSummaryRow[] = sortedUsers.map((u) => ({
    userId: u.userId,
    userName: u.userName,
    receiptCount: u.receiptCount,
    ...u.totals,
  }));

  const detailRows: AllCashierUserDetailRow[] = sortedUsers.map((u) => ({
    userId: u.userId,
    userName: u.userName,
    receiptCount: u.receiptCount,
    totals: u.totals,
    sections: Array.from(u.sections.values()).sort((a, b) => a.title.localeCompare(b.title)),
  }));

  return {
    success: true,
    summaryRows,
    detailRows,
    grandTotals,
    totalReceipts,
  };
}
