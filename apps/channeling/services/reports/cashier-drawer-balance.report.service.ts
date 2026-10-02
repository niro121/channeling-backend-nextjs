'use server';

import prisma from '@/lib/prisma';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { TILL_PAYMENT_METHOD } from '@/types/accounting';
import type {
  CashierDrawerBalanceReportQuery,
  CashierDrawerBalanceReportRow
} from '@/types/reports/cashier-drawer-balance';

function parseAsOfDateTime(value: string): Date | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function getCashierDrawerBalanceReportService(
  query: CashierDrawerBalanceReportQuery
): Promise<{ success: boolean; data: CashierDrawerBalanceReportRow[]; totalRecords: number; message?: string }> {
  const asOfDateTime = parseAsOfDateTime(query.asOfDateTime);
  if (!asOfDateTime) {
    return { success: false, data: [], totalRecords: 0, message: 'As-of date/time is required.' };
  }

  const locationId = query.locationId && query.locationId !== '__all__' ? query.locationId : null;

  const tills = await prisma.account.findMany({
    where: { type: 'CASH', isActive: true, userId: { not: null }, ...(locationId ? { locationId } : {}) },
    select: {
      id: true,
      name: true,
      code: true,
      userId: true,
      user: { select: { name: true, staff: { select: { code: true } } } }
    },
    orderBy: [{ name: 'asc' }]
  });

  if (!tills.length) {
    return { success: true, data: [], totalRecords: 0 };
  }

  const accountIds = tills.map((t) => t.id);

  // Mongo-safe two-step date filter: resolve journal ids first, then filter journal lines by journalId.
  const journals = await prisma.journal.findMany({
    where: { date: { lte: asOfDateTime } },
    select: { id: true },
    orderBy: { date: 'asc' }
  });
  const journalIds = journals.map((j) => j.id);
  if (!journalIds.length) {
    const data: CashierDrawerBalanceReportRow[] = tills.map((t) => ({
      tillAccountId: t.id,
      tillAccountName: t.name ?? null,
      tillAccountCode: t.code ?? null,
      cashierUserId: t.userId ?? null,
      cashierName: t.user?.name ?? null,
      cashierStaffCode: t.user?.staff?.code ?? null,
      cashCents: 0,
      cardCents: 0,
      slipCents: 0,
      checkCents: 0,
      creditCents: 0,
      eWalletCents: 0,
      totalCents: 0
    }));
    return { success: true, data, totalRecords: data.length };
  }

  const grouped = await prisma.journalLine.groupBy({
    by: ['accountId', 'paymentMethod'],
    where: {
      accountId: { in: accountIds },
      journalId: { in: journalIds }
    },
    _sum: { debitAmount: true, creditAmount: true }
  });

  const byAccount = new Map<
    string,
    {
      cashCents: number;
      cardCents: number;
      slipCents: number;
      checkCents: number;
      creditCents: number;
      eWalletCents: number;
    }
  >();

  for (const g of grouped) {
    const accountId = g.accountId;
    const sumDebit = g._sum?.debitAmount ?? 0;
    const sumCredit = g._sum?.creditAmount ?? 0;
    const net = netEffectForAccountType(sumDebit, sumCredit, 'CASH');
    const pm = g.paymentMethod;

    const cur =
      byAccount.get(accountId) ??
      { cashCents: 0, cardCents: 0, slipCents: 0, checkCents: 0, creditCents: 0, eWalletCents: 0 };

    if (pm === TILL_PAYMENT_METHOD.CASH || pm == null) cur.cashCents += net;
    else if (pm === TILL_PAYMENT_METHOD.CREDIT_CARD) cur.cardCents += net;
    else if (pm === TILL_PAYMENT_METHOD.SLIP) cur.slipCents += net;
    else if (pm === TILL_PAYMENT_METHOD.CHECK) cur.checkCents += net;
    else if (pm === TILL_PAYMENT_METHOD.CREDIT) cur.creditCents += net;
    else if (pm === TILL_PAYMENT_METHOD.E_WALLET) cur.eWalletCents += net;
    else cur.cashCents += net;

    byAccount.set(accountId, cur);
  }

  const data: CashierDrawerBalanceReportRow[] = tills.map((t) => {
    const b = byAccount.get(t.id) ?? {
      cashCents: 0,
      cardCents: 0,
      slipCents: 0,
      checkCents: 0,
      creditCents: 0,
      eWalletCents: 0
    };
    const totalCents =
      b.cashCents + b.cardCents + b.slipCents + b.checkCents + b.creditCents + b.eWalletCents;

    return {
      tillAccountId: t.id,
      tillAccountName: t.name ?? null,
      tillAccountCode: t.code ?? null,
      cashierUserId: t.userId ?? null,
      cashierName: t.user?.name ?? null,
      cashierStaffCode: t.user?.staff?.code ?? null,
      cashCents: b.cashCents,
      cardCents: b.cardCents,
      slipCents: b.slipCents,
      checkCents: b.checkCents,
      creditCents: b.creditCents,
      eWalletCents: b.eWalletCents,
      totalCents
    };
  });

  return { success: true, data, totalRecords: data.length };
}

