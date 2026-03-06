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
};

// --- getTillBalanceBreakdown: cashier till balance by payment method ---
export async function getTillBalanceBreakdown(userId: string): Promise<TillBalanceBreakdown> {
  const acc = await prisma.account.findFirst({
    where: { type: 'CASH', userId, isActive: true },
    select: { id: true },
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
    };
  }

  const lines = await prisma.journalLine.findMany({
    where: { accountId: acc.id },
    select: { debitAmount: true, creditAmount: true, paymentMethod: true },
    orderBy: { journal: { date: 'asc' } },
  });

  let cashCents = 0;
  let cardCents = 0;
  let slipCents = 0;
  let checkCents = 0;
  let creditCents = 0;
  let eWalletCents = 0;
  for (const line of lines) {
    const net = netEffectForAccountType(line.debitAmount, line.creditAmount, 'CASH');
    if (line.paymentMethod === TILL_PAYMENT_METHOD.CASH) {
      cashCents += net;
    } else if (line.paymentMethod === TILL_PAYMENT_METHOD.CREDIT_CARD) {
      cardCents += net;
    } else if (line.paymentMethod === TILL_PAYMENT_METHOD.SLIP) {
      slipCents += net;
    } else if (line.paymentMethod === TILL_PAYMENT_METHOD.CHECK) {
      checkCents += net;
    } else if (line.paymentMethod === TILL_PAYMENT_METHOD.CREDIT) {
      creditCents += net;
    } else if (line.paymentMethod === TILL_PAYMENT_METHOD.E_WALLET) {
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
