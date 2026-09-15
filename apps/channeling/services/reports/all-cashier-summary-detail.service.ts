'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { RECEIPT_METHOD } from '@/types/receipt';
import type {
  AllCashierSummaryDetailReportQuery,
  AllCashierSummaryDetailReportResponse,
  AllCashierUserSummaryRow,
  AllCashierUserDetailRow,
  CashierSummaryPaymentAmounts,
} from '@/types/report';
import type { Prisma } from '@prisma/client';
import {
  CASHIER_SUMMARY_ZERO_AMOUNTS as ZERO_AMOUNTS,
  receiptToAmounts,
  receiptToAmountsDoctorPaymentNet,
  addCashierSummaryAmounts as addAmounts,
} from '@/lib/cashier-summary-amounts';

const MAX_RANGE_DAYS = getReportMaxRangeDays('all_cashier_summary_detail', getReportMaxRangeDays('cashier_summary', 62));
const MAX_RECEIPTS_SCAN = getReportMaxRecords('all_cashier_summary_detail', getReportMaxRecords('cashier_summary', 50000));

function parseDateTime(value: string, asEnd: boolean): Date | null {
  return parseReportDateTime(value, asEnd);
}

function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseDateTime(dateFrom, false);
  const end = parseDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
}

function sectionKeyFromReceipt(
  r: {
    method: number;
    bookingId: string | null;
    agencyId: string | null;
    reversedReceiptId: string | null;
    booking?: { status: number; refund: number } | null;
  },
  agentDepositCancelOrigIds: Set<string>
): { key: string; title: string } {
  if (
    r.method === RECEIPT_METHOD.AGENCY_WITHDRAW &&
    r.reversedReceiptId &&
    r.agencyId &&
    agentDepositCancelOrigIds.has(r.reversedReceiptId)
  ) {
    return { key: 'agentDepositCanceled', title: 'Agent Deposit - Canceled Bills' };
  }
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
    return { key: 'agentDeposit', title: 'Agent - Deposit & Withdraw Bills' };
  }
  if (r.method === RECEIPT_METHOD.AGENCY_WITHDRAW && r.agencyId) {
    return { key: 'agentDeposit', title: 'Agent - Deposit & Withdraw Bills' };
  }
  if (r.method === RECEIPT_METHOD.DOCTOR_PAYMENT || r.method === RECEIPT_METHOD.DOCTOR_CANCEL) {
    return { key: 'doctorPayment', title: 'Doctor Payment / Canceled - Bills' };
  }
  if (r.method === RECEIPT_METHOD.BRANCH_INCOME || r.method === RECEIPT_METHOD.BRANCH_EXPENSE) {
    return { key: 'incomeExpense', title: 'Income / Expenses - Bills' };
  }
  if (r.method === RECEIPT_METHOD.BANK_DEPOSIT) {
    return { key: 'bankDeposit', title: 'Bank Deposits - Bills' };
  }
  if (r.method === RECEIPT_METHOD.BANK_WITHDRAW) {
    return { key: 'bankWithdraw', title: 'Bank Withdrawals - Bills' };
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
      whd: true,
      bookingId: true,
      agencyId: true,
      reversedReceiptId: true,
      paymentLines: { select: { paymentMethod: true, amount: true } },
      booking: { select: { status: true, refund: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const withdrawReversalIds = receipts
    .filter((r) => r.method === RECEIPT_METHOD.AGENCY_WITHDRAW && r.reversedReceiptId)
    .map((r) => r.reversedReceiptId) as string[];
  const uniqueOrigIds = [...new Set(withdrawReversalIds)];
  const origDeposits =
    uniqueOrigIds.length > 0
      ? await prisma.receipt.findMany({
          where: { id: { in: uniqueOrigIds }, method: RECEIPT_METHOD.AGENCY_DEPOSIT },
          select: { id: true },
        })
      : [];
  const agentDepositCancelOrigIds = new Set(origDeposits.map((o) => o.id));

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
    // Exclude agent debit/credit notes from this report.
    if (
      r.agencyId &&
      (r.method === RECEIPT_METHOD.DEBIT_NOTE || r.method === RECEIPT_METHOD.CREDIT_NOTE)
    ) {
      continue;
    }
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
    const amounts =
      r.method === RECEIPT_METHOD.DOCTOR_PAYMENT || r.method === RECEIPT_METHOD.DOCTOR_CANCEL
        ? receiptToAmountsDoctorPaymentNet(r.paymentMethod, r.amount, r.type, r.whd, r.paymentLines)
        : receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
    const section = sectionKeyFromReceipt(r, agentDepositCancelOrigIds);

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
