'use server';

import prisma from '@/lib/prisma';
import type { Account } from '@/types/accounting';
import { AccountType } from '@prisma/client';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getAccountBalance } from '../balance-calc.service';
import { mapAccount } from '../map-account';

/** Cash account for a user (e.g. cashier till). */
export async function getCashAccountByUserId(userId: string): Promise<Account | null> {
  const row = await prisma.account.findFirst({
    where: {
      type: 'CASH',
      userId,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, name: true, email: true, staff: { select: { code: true } } } },
    },
  });
  return row ? mapAccount(row) : null;
}

/** Main cash book (no location, no parent). */
export async function getMainCashBookAccount(): Promise<Account | null> {
  const row = await prisma.account.findFirst({
    where: {
      type: 'CASH',
      parentAccountId: null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, staff: { select: { code: true } } } },
    },
  });
  return row ? mapAccount(row) : null;
}

/** Branch cash book for a location. */
export async function getCashBookAccountForBranch(
  locationId: string
): Promise<Account | null> {
  const row = await prisma.account.findFirst({
    where: {
      type: 'CASH',
      locationId,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, staff: { select: { code: true } } } },
    },
  });
  return row ? mapAccount(row) : null;
}

/** Single account by id. */
export async function getAccountById(id: string): Promise<Account | null> {
  const row = await prisma.account.findUnique({
    where: { id },
    include: {
      parentAccount: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
      creditCustomer: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, name: true, email: true, staff: { select: { code: true } } } },
      bankAccounts: {
        select: {
          id: true,
          name: true,
          accountNumber: true,
          bankId: true,
          institution: true,
          bank: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  return row ? mapAccount(row) : null;
}

export type GetAllAccountsParams = {
  page?: number;
  limit?: number;
  type?: AccountType | null;
  locationId?: string | null;
  /** Specific user id, or `'__none__'` for accounts with no linked user. */
  userId?: string | null;
  keyword?: string | null;
};

/** Users who have at least one active linked account (for the Accounting filter). */
export async function getLinkedAccountUserOptions(): Promise<
  Array<{ id: string; name: string }>
> {
  const users = await prisma.user.findMany({
    where: { accounts: { some: { isActive: true } } },
    select: { id: true, name: true, staff: { select: { code: true } } },
    orderBy: { name: 'asc' },
  });

  return users.map((u) => ({
    id: u.id,
    name: formatUserDisplayName(u.name, u.id, u.staff?.code),
  }));
}

/** List accounts for Accounting page (with balance). */
export async function getAllAccounts(
  params: GetAllAccountsParams = {}
): Promise<{
  success: boolean;
  data?: Account[];
  totalRecords?: number;
  error?: string;
}> {
  const { page = 0, limit = 50, type, locationId, userId, keyword } = params;

  const where: {
    isActive?: boolean;
    type?: AccountType;
    locationId?: string | null;
    userId?: string | null;
    OR?: { name?: { contains: string; mode: 'insensitive' }; code?: { contains: string; mode: 'insensitive' } }[];
  } = { isActive: true };

  if (type) where.type = type;
  if (locationId) where.locationId = locationId;
  if (userId === '__none__') where.userId = null;
  else if (userId) where.userId = userId;
  if (keyword && keyword.trim()) {
    where.OR = [
      { name: { contains: keyword.trim(), mode: 'insensitive' } },
      { code: { contains: keyword.trim(), mode: 'insensitive' } },
    ];
  }

  const [totalRecords, rows] = await Promise.all([
    prisma.account.count({ where }),
    prisma.account.findMany({
      where,
      include: {
        location: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, code: true } },
        agency: { select: { id: true, name: true, code: true } },
        creditCustomer: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true, email: true, staff: { select: { code: true } } } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip: page * limit,
      take: limit,
    }),
  ]);

  const balances = await Promise.all(rows.map((row) => getAccountBalance(row.id)));
  const accountsWithBalance: (Account & { balance: number })[] = rows.map((row, i) => ({
    ...mapAccount(row),
    balance: balances[i] ?? 0,
  }));

  return {
    success: true,
    data: accountsWithBalance,
    totalRecords,
  };
}
