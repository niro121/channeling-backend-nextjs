'use server';

import prisma from '@/lib/prisma';
import { getCashBookAccountForBranch, getMainCashBookAccount } from './account.service';
import { getAccountBalance } from './balance-calc.service';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { TILL_PAYMENT_METHOD } from '@/types/accounting';

// --- getBranchCashBalance ---
export async function getBranchCashBalance(locationId: string): Promise<number> {
  const acc = await getCashBookAccountForBranch(locationId);
  if (!acc) return 0;
  return getAccountBalance(acc.id);
}

// --- getCashierFloatBalance: balance of cashier's CASH account (till), 0 if no account ---
export async function getCashierFloatBalance(userId: string): Promise<number> {
  const acc = await prisma.account.findFirst({
    where: { type: 'CASH', userId, isActive: true },
    select: { id: true },
  });
  if (!acc) return 0;
  return getAccountBalance(acc.id);
}

export type TillBalanceBreakdown = {
  totalCents: number;
  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  creditCents: number;
  eWalletCents: number;
  /** Till account id if found */
  tillAccountId: string | null;
  tillAccountName: string | null;
  tillAccountCode: string | null;
};

// --- getTillBalanceBreakdown: cashier till balance by payment method ---
// Uses DB aggregation (groupBy + _sum) so it stays fast with millions of lines.
export async function getTillBalanceBreakdown(userId: string): Promise<TillBalanceBreakdown> {
  const acc = await prisma.account.findFirst({
    where: { type: 'CASH', userId, isActive: true },
    select: { id: true, name: true, code: true },
  });
  if (!acc) {
    return {
      totalCents: 0,
      cashCents: 0,
      cardCents: 0,
      slipCents: 0,
      checkCents: 0,
      creditCents: 0,
      eWalletCents: 0,
      tillAccountId: null,
      tillAccountName: null,
      tillAccountCode: null,
    };
  }

  const result = await prisma.journalLine.groupBy({
    by: ['paymentMethod'],
    where: { accountId: acc.id },
    _sum: { debitAmount: true, creditAmount: true },
  });

  let cashCents = 0;
  let cardCents = 0;
  let slipCents = 0;
  let checkCents = 0;
  let creditCents = 0;
  let eWalletCents = 0;
  for (const row of result) {
    const sumDebit = row._sum?.debitAmount ?? 0;
    const sumCredit = row._sum?.creditAmount ?? 0;
    const net = netEffectForAccountType(sumDebit, sumCredit, 'CASH');
    const pm = row.paymentMethod;
    if (pm === TILL_PAYMENT_METHOD.CASH) {
      cashCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.CREDIT_CARD) {
      cardCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.SLIP) {
      slipCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.CHECK) {
      checkCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.CREDIT) {
      creditCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.E_WALLET) {
      eWalletCents += net;
    } else {
      cashCents += net;
    }
  }
  const totalCents =
    cashCents + cardCents + slipCents + checkCents + creditCents + eWalletCents;
  return {
    totalCents,
    cashCents,
    cardCents,
    slipCents,
    checkCents,
    creditCents,
    eWalletCents,
    tillAccountId: acc.id,
    tillAccountName: acc.name ?? null,
    tillAccountCode: acc.code ?? null,
  };
}

/** Till balance by payment method for a given till account (e.g. for refund balance check by method). */
export async function getTillBalanceBreakdownForAccount(
  accountId: string
): Promise<TillBalanceBreakdown> {
  const acc = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, name: true, code: true },
  });
  if (!acc) {
    return {
      totalCents: 0,
      cashCents: 0,
      cardCents: 0,
      slipCents: 0,
      checkCents: 0,
      creditCents: 0,
      eWalletCents: 0,
      tillAccountId: null,
      tillAccountName: null,
      tillAccountCode: null,
    };
  }

  const result = await prisma.journalLine.groupBy({
    by: ['paymentMethod'],
    where: { accountId: acc.id },
    _sum: { debitAmount: true, creditAmount: true },
  });

  let cashCents = 0;
  let cardCents = 0;
  let slipCents = 0;
  let checkCents = 0;
  let creditCents = 0;
  let eWalletCents = 0;
  for (const row of result) {
    const sumDebit = row._sum?.debitAmount ?? 0;
    const sumCredit = row._sum?.creditAmount ?? 0;
    const net = netEffectForAccountType(sumDebit, sumCredit, 'CASH');
    const pm = row.paymentMethod;
    if (pm === TILL_PAYMENT_METHOD.CASH) {
      cashCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.CREDIT_CARD) {
      cardCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.SLIP) {
      slipCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.CHECK) {
      checkCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.CREDIT) {
      creditCents += net;
    } else if (pm === TILL_PAYMENT_METHOD.E_WALLET) {
      eWalletCents += net;
    } else {
      cashCents += net;
    }
  }
  const totalCents =
    cashCents + cardCents + slipCents + checkCents + creditCents + eWalletCents;
  return {
    totalCents,
    cashCents,
    cardCents,
    slipCents,
    checkCents,
    creditCents,
    eWalletCents,
    tillAccountId: acc.id,
    tillAccountName: acc.name ?? null,
    tillAccountCode: acc.code ?? null,
  };
}

// --- getFullInstituteCashBalance ---
export async function getFullInstituteCashBalance(
  asOfDate?: Date
): Promise<number> {
  const main = await getMainCashBookAccount();
  if (!main) return 0;

  let total = await getAccountBalance(main.id, asOfDate);

  const children = await prisma.account.findMany({
    where: { parentAccountId: main.id, type: 'CASH', isActive: true },
    select: { id: true },
  });
  for (const c of children) {
    total += await getAccountBalance(c.id, asOfDate);
  }
  return total;
}
