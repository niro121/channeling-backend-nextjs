'use server';

import prisma from '@/lib/prisma';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/accounting';
import { AccountType } from '@prisma/client';
import { z } from 'zod';
import { getAccountBalance } from './balance-calc.service';
import { mapAccount } from './map-account';

const ACCOUNT_TYPES = ['CASH', 'PAYABLE', 'RECEIVABLE'] as const;

const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').trim(),
  type: z.enum(ACCOUNT_TYPES, { required_error: 'Type is required', invalid_type_error: 'Type must be CASH, PAYABLE, or RECEIVABLE' }),
  code: z.string().max(50).optional().nullable().transform((v) => (v === '' ? null : v ?? null)),
  parentAccountId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  agencyId: z.string().optional().nullable(),
  creditCustomerId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  minBalanceAllowed: z.number().int().optional().nullable(),
});

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').trim().optional(),
  code: z.string().max(50).optional().nullable().transform((v) => (v === '' ? null : v)),
  parentAccountId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  agencyId: z.string().optional().nullable(),
  creditCustomerId: z.string().optional().nullable(),
  minBalanceAllowed: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

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
  creditCustomerId?: string | null;
  userId?: string | null;
  name?: string;
  minBalanceAllowed?: number | null;
};

export async function getOrCreateAccount(
  params: GetOrCreateAccountParams
): Promise<{ success: true; account: Account } | { success: false; error: string }> {
  const { type, locationId, doctorId, agencyId, creditCustomerId, userId, name, minBalanceAllowed } =
    params;

  const existing = await prisma.account.findFirst({
    where: {
      type,
      locationId: locationId ?? null,
      doctorId: doctorId ?? null,
      agencyId: agencyId ?? null,
      creditCustomerId: creditCustomerId ?? null,
      userId: userId ?? null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
      creditCustomer: { select: { id: true, name: true, code: true } },
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
        : type === 'RECEIVABLE' && creditCustomerId
          ? 'Credit Customer'
          : 'Account';

  const createInput: CreateAccountInput = {
    name: name?.trim() || defaultName,
    type,
    parentAccountId: parentId ?? null,
    locationId: locationId ?? null,
    doctorId: doctorId ?? null,
    agencyId: agencyId ?? null,
    creditCustomerId: creditCustomerId ?? null,
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

function formatZodError(err: z.ZodError): string {
  const first = err.errors[0];
  return first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
}

// --- createAccount ---
export async function createAccount(
  data: CreateAccountInput
): Promise<
  { success: true; account: Account } | { success: false; error: string }
> {
  const parsed = createAccountSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }
  data = parsed.data as CreateAccountInput;

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
      creditCustomerId: data.creditCustomerId ?? null,
      userId: data.userId ?? null,
      minBalanceAllowed: data.minBalanceAllowed ?? null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
      creditCustomer: { select: { id: true, name: true, code: true } },
    },
  });

  return { success: true, account: mapAccount(created) };
}

// --- updateAccount ---
export async function updateAccount(
  id: string,
  data: UpdateAccountInput
): Promise<
  { success: true; account: Account } | { success: false; error: string }
> {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return { success: false, error: 'Account ID is required' };
  }
  const parsed = updateAccountSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }
  data = parsed.data as UpdateAccountInput;

  try {
    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code ?? null }),
        ...(data.parentAccountId !== undefined && { parentAccountId: data.parentAccountId ?? null }),
        ...(data.locationId !== undefined && { locationId: data.locationId ?? null }),
        ...(data.doctorId !== undefined && { doctorId: data.doctorId ?? null }),
        ...(data.agencyId !== undefined && { agencyId: data.agencyId ?? null }),
        ...(data.creditCustomerId !== undefined && { creditCustomerId: data.creditCustomerId ?? null }),
        ...(data.minBalanceAllowed !== undefined && { minBalanceAllowed: data.minBalanceAllowed ?? null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    const row = await prisma.account.findUnique({
      where: { id: updated.id },
      include: {
        parentAccount: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, code: true } },
        agency: { select: { id: true, name: true, code: true } },
        creditCustomer: { select: { id: true, name: true, code: true } },
      },
    });
    return { success: true, account: mapAccount(row!) };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e) {
      const code = (e as { code: string }).code;
      if (code === 'P2025') return { success: false, error: 'Account not found' };
      if (code === 'P2002') return { success: false, error: 'Code already in use' };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update account',
    };
  }
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
      creditCustomer: { select: { id: true, name: true, code: true } },
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
        creditCustomer: { select: { id: true, name: true, code: true } },
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
