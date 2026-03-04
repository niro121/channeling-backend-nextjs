'use server';

import prisma from '@/lib/prisma';
import type { Account, CreateAccountInput } from '@/types/accounting';
import { AccountType } from '@prisma/client';
import { getAccountBalance } from './balance-calc.service';
import { mapAccount } from './map-account';

// --- getCashAccountByUserId (bulk cashier float account check) ---
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
    },
  });
  return row ? mapAccount(row) : null;
}

// --- getMainCashBookAccount ---
export async function getMainCashBookAccount(): Promise<Account | null> {
  const row = await prisma.account.findFirst({
    where: {
      type: 'CASH',
      parentAccountId: null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
    },
  });
  return row ? mapAccount(row) : null;
}

// --- getCashBookAccountForBranch ---
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
    },
  });
  return row ? mapAccount(row) : null;
}

// --- getOrCreateAccount ---
export type GetOrCreateAccountParams = {
  type: AccountType;
  locationId?: string | null;
  doctorId?: string | null;
  agencyId?: string | null;
  userId?: string | null;
  name?: string;
  minBalanceAllowed?: number | null;
};

export async function getOrCreateAccount(
  params: GetOrCreateAccountParams
): Promise<{ success: true; account: Account } | { success: false; error: string }> {
  const { type, locationId, doctorId, agencyId, userId, name, minBalanceAllowed } =
    params;

  const existing = await prisma.account.findFirst({
    where: {
      type,
      locationId: locationId ?? null,
      doctorId: doctorId ?? null,
      agencyId: agencyId ?? null,
      userId: userId ?? null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });

  if (existing) {
    return { success: true, account: mapAccount(existing) };
  }

  const mainCash = type === 'CASH' && !locationId ? null : await getMainCashBookAccount();
  const parentId =
    type === 'CASH' && locationId && mainCash ? mainCash.id : null;

  const defaultName =
    type === 'CASH' && locationId
      ? 'Cash Book - Branch'
      : type === 'PAYABLE' && doctorId
        ? 'Doctor Payable'
        : 'Account';

  const createInput: CreateAccountInput = {
    name: name?.trim() || defaultName,
    type,
    parentAccountId: parentId ?? null,
    locationId: locationId ?? null,
    doctorId: doctorId ?? null,
    agencyId: agencyId ?? null,
    userId: userId ?? null,
    minBalanceAllowed: minBalanceAllowed ?? null,
  };

  // User (cashier) accounts require a linked staff; use staff code as account code. Do not create without it.
  if (userId) {
    const userWithStaff = await prisma.user.findUnique({
      where: { id: userId },
      select: { staff: { select: { code: true } } },
    });
    const staffCode = userWithStaff?.staff?.code;
    if (!staffCode) {
      return {
        success: false,
        error: 'User must have a linked staff account to create a cashier float account.',
      };
    }
    createInput.code = staffCode;
  }

  const result = await createAccount(createInput);
  if (!result.success) return result;
  return { success: true, account: result.account! };
}

// --- createAccount ---
export async function createAccount(
  data: CreateAccountInput
): Promise<
  { success: true; account: Account } | { success: false; error: string }
> {
  const { type, parentAccountId, locationId } = data;

  if (type === 'CASH' && locationId && !parentAccountId) {
    const main = await getMainCashBookAccount();
    if (!main) {
      return { success: false, error: 'Main Cash Book account must exist before creating branch accounts' };
    }
    data.parentAccountId = main.id;
  }

  const created = await prisma.account.create({
    data: {
      code: data.code ?? null,
      name: data.name,
      type: data.type,
      parentAccountId: data.parentAccountId ?? null,
      locationId: data.locationId ?? null,
      doctorId: data.doctorId ?? null,
      agencyId: data.agencyId ?? null,
      userId: data.userId ?? null,
      minBalanceAllowed: data.minBalanceAllowed ?? null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });

  return { success: true, account: mapAccount(created) };
}

// --- getAccountById ---
export async function getAccountById(
  id: string
): Promise<Account | null> {
  const row = await prisma.account.findUnique({
    where: { id },
    include: {
      parentAccount: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });
  return row ? mapAccount(row) : null;
}

// --- getAllAccounts (for list page) ---
export type GetAllAccountsParams = {
  page?: number;
  limit?: number;
  type?: AccountType | null;
  locationId?: string | null;
  keyword?: string | null;
};

export async function getAllAccounts(
  params: GetAllAccountsParams = {}
): Promise<{
  success: boolean;
  data?: Account[];
  totalRecords?: number;
  error?: string;
}> {
  const { page = 0, limit = 50, type, locationId, keyword } = params;

  const where: {
    isActive?: boolean;
    type?: AccountType;
    locationId?: string | null;
    OR?: { name?: { contains: string; mode: 'insensitive' }; code?: { contains: string; mode: 'insensitive' } }[];
  } = { isActive: true };

  if (type) where.type = type;
  if (locationId) where.locationId = locationId;
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
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip: page * limit,
      take: limit,
    }),
  ]);

  const accountsWithBalance: (Account & { balance: number })[] = [];
  for (const row of rows) {
    const balance = await getAccountBalance(row.id);
    accountsWithBalance.push({ ...mapAccount(row), balance });
  }

  return {
    success: true,
    data: accountsWithBalance,
    totalRecords,
  };
}
