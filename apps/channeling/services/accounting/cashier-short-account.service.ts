'use server';

import prisma from '@/lib/prisma';
import { createAccount } from './account/write.service';
import { getAccountBalance } from './balance-calc.service';

const CASHIER_SHORT_CODE_PREFIX = 'SHT-';

export type CashierShortBalance = {
  accountId: string | null;
  accountName: string | null;
  accountCode: string | null;
  locationId: string;
  balanceCents: number;
};

const emptyBalance = (locationId: string): CashierShortBalance => ({
  accountId: null,
  accountName: null,
  accountCode: null,
  locationId,
  balanceCents: 0,
});

async function findCashierShortAccount(userId: string, locationId: string) {
  return prisma.account.findFirst({
    where: {
      type: 'RECEIVABLE',
      userId,
      locationId,
      isActive: true,
      code: { startsWith: CASHIER_SHORT_CODE_PREFIX },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, code: true },
  });
}

/** Outstanding short for this cashier at this branch. Zero when no short account exists yet. */
export async function getCashierShortBalance(
  userId: string,
  locationId: string
): Promise<CashierShortBalance> {
  const account = await findCashierShortAccount(userId, locationId);
  if (!account) return emptyBalance(locationId);
  const balanceCents = await getAccountBalance(account.id);
  return {
    accountId: account.id,
    accountName: account.name ?? null,
    accountCode: account.code ?? null,
    locationId,
    balanceCents,
  };
}

/**
 * One receivable per cashier per branch. Created the first time a short is approved.
 * Balance cannot go below zero, so a settlement cannot exceed what is owed.
 */
export async function ensureCashierShortAccount(
  userId: string,
  locationId: string
): Promise<{ success: true; account: CashierShortBalance } | { success: false; error: string }> {
  const existing = await getCashierShortBalance(userId, locationId);
  if (existing.accountId) return { success: true, account: existing };

  const userWithStaff = await prisma.user.findUnique({
    where: { id: userId },
    select: { staff: { select: { code: true } } },
  });
  const staffCode = userWithStaff?.staff?.code?.trim();
  if (!staffCode) {
    return { success: false, error: 'User must have a linked staff account to create a short account.' };
  }
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true, code: true },
  });
  if (!location) {
    return { success: false, error: 'Branch not found for this short account.' };
  }
  const locationCode = location.code?.trim() || null;
  const code = (locationCode ? `SHT-${staffCode}-${locationCode}` : `SHT-${staffCode}`).slice(0, 50);
  const name = locationCode
    ? `Short - Cashier (${staffCode}) (${locationCode})`
    : `Short - Cashier (${staffCode}) (${location.name})`;

  const created = await createAccount({
    name,
    type: 'RECEIVABLE',
    code,
    locationId,
    userId,
    minBalanceAllowed: 0,
  });
  if (!created.success) {
    const byCode = await prisma.account.findUnique({
      where: { code },
      select: { id: true, name: true, code: true, type: true, userId: true, locationId: true, isActive: true },
    });
    if (
      byCode &&
      byCode.type === 'RECEIVABLE' &&
      byCode.userId === userId &&
      byCode.locationId === locationId
    ) {
      if (!byCode.isActive) {
        await prisma.account.update({ where: { id: byCode.id }, data: { isActive: true } });
      }
      const balanceCents = await getAccountBalance(byCode.id);
      return {
        success: true,
        account: {
          accountId: byCode.id,
          accountName: byCode.name ?? null,
          accountCode: byCode.code ?? null,
          locationId,
          balanceCents,
        },
      };
    }
    return { success: false, error: created.error };
  }

  return {
    success: true,
    account: {
      accountId: created.account.id,
      accountName: created.account.name ?? null,
      accountCode: created.account.code ?? null,
      locationId,
      balanceCents: 0,
    },
  };
}
