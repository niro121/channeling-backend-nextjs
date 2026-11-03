'use server';

import prisma from '@/lib/prisma';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { getReportMaxRecords } from '@/lib/report-limits';
import { TILL_PAYMENT_METHOD } from '@/types/accounting';
import type {
  CashierShortBalanceReportQuery,
  CashierShortBalanceReportRow
} from '@/types/reports/cashier-short-balance';

/** Matches cashier short accounts created in cashier-short-account.service.ts */
const CASHIER_SHORT_CODE_PREFIX = 'SHT-';
const MAX_ACCOUNTS = 5000;
const MAX_JOURNAL_LINES = getReportMaxRecords('cashier_short_balance', 50000);

type MethodBuckets = {
  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  creditCents: number;
  eWalletCents: number;
};

function emptyBuckets(): MethodBuckets {
  return {
    cashCents: 0,
    cardCents: 0,
    slipCents: 0,
    checkCents: 0,
    creditCents: 0,
    eWalletCents: 0
  };
}

function addByMethod(buckets: MethodBuckets, paymentMethod: number | null, net: number) {
  if (paymentMethod === TILL_PAYMENT_METHOD.CREDIT_CARD) buckets.cardCents += net;
  else if (paymentMethod === TILL_PAYMENT_METHOD.SLIP) buckets.slipCents += net;
  else if (paymentMethod === TILL_PAYMENT_METHOD.CHECK) buckets.checkCents += net;
  else if (paymentMethod === TILL_PAYMENT_METHOD.CREDIT) buckets.creditCents += net;
  else if (paymentMethod === TILL_PAYMENT_METHOD.E_WALLET) buckets.eWalletCents += net;
  else buckets.cashCents += net;
}

function sortLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export async function getCashierShortBalanceReportService(
  query: CashierShortBalanceReportQuery
): Promise<{ success: boolean; data: CashierShortBalanceReportRow[]; totalRecords: number; message?: string }> {
  const asOf = parseReportDateTime(query.asOfDateTime ?? '', true);
  if (!asOf) {
    return { success: false, data: [], totalRecords: 0, message: 'As-of date/time is required.' };
  }

  const locationId = query.locationId && query.locationId !== '__all__' ? query.locationId : null;
  const where = {
    type: 'RECEIVABLE' as const,
    isActive: true,
    userId: { not: null },
    code: { startsWith: CASHIER_SHORT_CODE_PREFIX },
    ...(locationId ? { locationId } : {})
  };

  const accountCount = await prisma.account.count({ where });
  if (accountCount > MAX_ACCOUNTS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Too many short accounts for this report (${accountCount}). Please narrow the branch filter.`
    };
  }

  const accounts = await prisma.account.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      userId: true,
      locationId: true,
      user: { select: { name: true, staff: { select: { code: true } } } },
      location: { select: { name: true, code: true } }
    }
  });

  if (!accounts.length) {
    return { success: true, data: [], totalRecords: 0 };
  }

  const accountIds = accounts.map((account) => account.id);
  const lineCount = await prisma.journalLine.count({
    where: { accountId: { in: accountIds } }
  });
  if (lineCount > MAX_JOURNAL_LINES) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Too many records for the selected filters (${lineCount}). Please narrow the branch filter.`
    };
  }

  const byAccount = new Map<string, MethodBuckets>();
  if (lineCount > 0) {
    const lines = await prisma.journalLine.findMany({
      where: { accountId: { in: accountIds } },
      select: {
        accountId: true,
        paymentMethod: true,
        debitAmount: true,
        creditAmount: true,
        journal: { select: { date: true } }
      }
    });

    for (const line of lines) {
      const journalDate = line.journal?.date;
      if (!journalDate || journalDate.getTime() > asOf.getTime()) continue;
      const net = netEffectForAccountType(line.debitAmount ?? 0, line.creditAmount ?? 0, 'RECEIVABLE');
      const buckets = byAccount.get(line.accountId) ?? emptyBuckets();
      addByMethod(buckets, line.paymentMethod, net);
      byAccount.set(line.accountId, buckets);
    }
  }

  const data: CashierShortBalanceReportRow[] = accounts.map((account) => {
    const buckets = byAccount.get(account.id) ?? emptyBuckets();
    const totalCents =
      buckets.cashCents +
      buckets.cardCents +
      buckets.slipCents +
      buckets.checkCents +
      buckets.creditCents +
      buckets.eWalletCents;

    return {
      accountId: account.id,
      accountName: account.name ?? null,
      accountCode: account.code ?? null,
      cashierUserId: account.userId ?? null,
      cashierName: account.user?.name ?? null,
      cashierStaffCode: account.user?.staff?.code ?? null,
      locationId: account.locationId ?? null,
      locationName: account.location?.name ?? null,
      locationCode: account.location?.code ?? null,
      ...buckets,
      totalCents
    };
  });

  data.sort((a, b) => {
    const byCashier = sortLabel(a.cashierName).localeCompare(sortLabel(b.cashierName));
    if (byCashier !== 0) return byCashier;
    const byBranch = sortLabel(a.locationName).localeCompare(sortLabel(b.locationName));
    if (byBranch !== 0) return byBranch;
    return sortLabel(a.accountCode).localeCompare(sortLabel(b.accountCode));
  });

  return { success: true, data, totalRecords: data.length };
}
