'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getReportMaxRecords } from '@/lib/report-limits';
import { RECEIPT_METHOD, RECEIPT_METHOD_NAMES } from '@/types/receipt';
import {
  CASHIER_SUMMARY_ZERO_AMOUNTS,
  addCashierSummaryAmounts,
  receiptToAmounts,
  receiptToAmountsDoctorPaymentNet,
} from '@/lib/cashier-summary-amounts';
import { dailyReturnsFloatTotal, rowFromAmounts } from '@/lib/daily-returns-summary-amounts';
import {
  DAILY_RETURNS_RECEIPT_METHODS,
  type DailyReturnsSummaryBucketKey,
  type DailyReturnsSummaryReportQuery,
  type DailyReturnsSummaryReportRow,
  type DailyReturnsSummaryTotals,
} from '@/types/reports/daily-returns-summary';

const MAX_RECEIPTS_SCAN = getReportMaxRecords('daily_returns_summary', 50000);

const INCLUDED_METHOD_SET = new Set<number>(DAILY_RETURNS_RECEIPT_METHODS);

function parseReportDate(value: string): { from: Date; to: Date } | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number);
  if (!y || !m || !d) return null;
  const from = new Date(y, m - 1, d, 0, 0, 0, 0);
  const to = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  return { from, to };
}

function classifyBucket(method: number): DailyReturnsSummaryBucketKey | null {
  if (!INCLUDED_METHOD_SET.has(method)) return null;
  return method as DailyReturnsSummaryBucketKey;
}

export async function getDailyReturnsSummaryReportService(
  query: DailyReturnsSummaryReportQuery
): Promise<{
  success: boolean;
  data: DailyReturnsSummaryReportRow[];
  totalRecords: number;
  totals?: DailyReturnsSummaryTotals;
  message?: string;
}> {
  const range = parseReportDate(query.reportDate);
  if (!range) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: 'Report date is required (YYYY-MM-DD).',
    };
  }

  const baseWhere: Prisma.ReceiptWhereInput = {
    createdAt: { gte: range.from, lte: range.to },
    method: { in: [...DAILY_RETURNS_RECEIPT_METHODS] },
  };

  if (query.locationId && query.locationId !== '__all__') {
    baseWhere.OR = [{ locationId: query.locationId }, { userLocationId: query.locationId }];
  }

  const matchedReceiptCount = await prisma.receipt.count({ where: baseWhere });
  if (matchedReceiptCount > MAX_RECEIPTS_SCAN) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Too many receipts on selected date (${matchedReceiptCount}). Please contact support or narrow by branch.`,
    };
  }

  const receipts = await prisma.receipt.findMany({
    where: baseWhere,
    select: {
      method: true,
      paymentMethod: true,
      amount: true,
      type: true,
      whd: true,
      paymentLines: { select: { paymentMethod: true, amount: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const bucketAmounts = new Map<DailyReturnsSummaryBucketKey, typeof CASHIER_SUMMARY_ZERO_AMOUNTS>();
  const bucketCounts = new Map<DailyReturnsSummaryBucketKey, number>();
  for (const method of DAILY_RETURNS_RECEIPT_METHODS) {
    bucketAmounts.set(method, { ...CASHIER_SUMMARY_ZERO_AMOUNTS });
    bucketCounts.set(method, 0);
  }

  for (const r of receipts) {
    const bucket = classifyBucket(r.method);
    if (bucket === null) continue;

    const amounts =
      r.method === RECEIPT_METHOD.DOCTOR_PAYMENT || r.method === RECEIPT_METHOD.DOCTOR_CANCEL
        ? receiptToAmountsDoctorPaymentNet(r.paymentMethod, r.amount, r.type, r.whd, r.paymentLines)
        : receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);

    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
    bucketAmounts.set(bucket, addCashierSummaryAmounts(bucketAmounts.get(bucket)!, amounts));
  }

  const data: DailyReturnsSummaryReportRow[] = DAILY_RETURNS_RECEIPT_METHODS.map((method) =>
    rowFromAmounts(
      method,
      RECEIPT_METHOD_NAMES[method] ?? `Method ${method}`,
      bucketCounts.get(method) ?? 0,
      bucketAmounts.get(method)!
    )
  );

  let grandAmounts = { ...CASHIER_SUMMARY_ZERO_AMOUNTS };
  let grandCount = 0;
  for (const row of data) {
    grandCount += row.count;
    grandAmounts = addCashierSummaryAmounts(grandAmounts, {
      cash: row.cash,
      creditCard: row.creditCard,
      slip: row.slip,
      cheque: row.cheque,
      agent: row.agent,
      agentCredit: row.credit,
      eWallet: row.eWallet,
    });
  }

  const totals: DailyReturnsSummaryTotals = {
    count: grandCount,
    ...grandAmounts,
    floatTotal: dailyReturnsFloatTotal(grandAmounts),
  };

  return {
    success: true,
    data,
    totalRecords: data.length,
    totals,
  };
}
