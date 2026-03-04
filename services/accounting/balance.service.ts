'use server';

import prisma from '@/lib/prisma';
import { getCashBookAccountForBranch, getMainCashBookAccount } from './account.service';
import { getAccountBalance } from './balance-calc.service';

// --- getBranchCashBalance ---
export async function getBranchCashBalance(locationId: string): Promise<number> {
  const acc = await getCashBookAccountForBranch(locationId);
  if (!acc) return 0;
  return getAccountBalance(acc.id);
}

// --- getCashierFloatBalance: balance of cashier's CASH account (float), 0 if no account ---
export async function getCashierFloatBalance(userId: string): Promise<number> {
  const acc = await prisma.account.findFirst({
    where: { type: 'CASH', userId, isActive: true },
    select: { id: true },
  });
  if (!acc) return 0;
  return getAccountBalance(acc.id);
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
