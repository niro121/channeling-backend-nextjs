'use server';

import prisma from '@/lib/prisma';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/accounting';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getMainCashBookAccount } from './read.service';
import { mapAccount } from '../map-account';

const ACCOUNT_TYPES = ['CASH', 'PAYABLE', 'RECEIVABLE'] as const;

const MIN_BALANCE_ALLOWED_MIN = -2147483648; // 32-bit signed int min (cents)
const MIN_BALANCE_ALLOWED_MAX = 2147483647; // 32-bit signed int max (cents)

const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').trim(),
  type: z.enum(ACCOUNT_TYPES, { message: 'Type is required and must be CASH, PAYABLE, or RECEIVABLE' }),
  code: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v == null || String(v).trim() === '' ? null : String(v).trim())),
  parentAccountId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  agencyId: z.string().optional().nullable(),
  creditCustomerId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  minBalanceAllowed: z
    .number()
    .int('Minimum balance must be a whole number (in cents)')
    .min(MIN_BALANCE_ALLOWED_MIN, `Minimum balance must be at least ${MIN_BALANCE_ALLOWED_MIN / 100} (in cents)`)
    .max(MIN_BALANCE_ALLOWED_MAX, `Minimum balance must be at most ${MIN_BALANCE_ALLOWED_MAX / 100} (in cents)`)
    .optional()
    .nullable(),
  maxBalanceAllowed: z
    .number()
    .int('Maximum balance must be a whole number (in cents)')
    .min(MIN_BALANCE_ALLOWED_MIN, `Maximum balance must be at least ${MIN_BALANCE_ALLOWED_MIN / 100} (in cents)`)
    .max(MIN_BALANCE_ALLOWED_MAX, `Maximum balance must be at most ${MIN_BALANCE_ALLOWED_MAX / 100} (in cents)`)
    .optional()
    .nullable(),
});

const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be at most 200 characters')
    .trim()
    .optional(),
  code: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v == null || String(v).trim() === '' ? null : String(v).trim())),
  parentAccountId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || String(v).trim() === '' ? null : String(v).trim())),
  locationId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || String(v).trim() === '' ? null : String(v).trim())),
  doctorId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || String(v).trim() === '' ? null : String(v).trim())),
  agencyId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || String(v).trim() === '' ? null : String(v).trim())),
  creditCustomerId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || String(v).trim() === '' ? null : String(v).trim())),
  minBalanceAllowed: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined) return undefined; // key not sent: don't update
      if (v === null || v === '') return null; // explicit clear
      const n = typeof v === 'string' ? Number(String(v).replace(/,/g, '')) : v;
      return Number.isFinite(n) ? Math.round(n) : null;
    })
    .pipe(
      z
        .number()
        .int('Minimum balance must be a whole number (in cents)')
        .min(MIN_BALANCE_ALLOWED_MIN, `Minimum balance must be at least ${MIN_BALANCE_ALLOWED_MIN / 100} (in cents)`)
        .max(MIN_BALANCE_ALLOWED_MAX, `Minimum balance must be at most ${MIN_BALANCE_ALLOWED_MAX / 100} (in cents)`)
        .optional()
        .nullable()
    ),
  maxBalanceAllowed: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const n = typeof v === 'string' ? Number(String(v).replace(/,/g, '')) : v;
      return Number.isFinite(n) ? Math.round(n) : null;
    })
    .pipe(
      z
        .number()
        .int('Maximum balance must be a whole number (in cents)')
        .min(MIN_BALANCE_ALLOWED_MIN, `Maximum balance must be at least ${MIN_BALANCE_ALLOWED_MIN / 100} (in cents)`)
        .max(MIN_BALANCE_ALLOWED_MAX, `Maximum balance must be at most ${MIN_BALANCE_ALLOWED_MAX / 100} (in cents)`)
        .optional()
        .nullable()
    ),
  isActive: z.boolean().optional(),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
}

/** Create a new account (validation + main cash book check for branch CASH). */
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

  try {
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
        maxBalanceAllowed: data.maxBalanceAllowed ?? null,
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return {
        success: false,
        error: 'An account with this code already exists. Please check Accounting setup or use the existing account.',
      };
    }
    throw e;
  }
}

/** Update an existing account. */
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

  const updatableKeys = [
    'name',
    'code',
    'parentAccountId',
    'locationId',
    'doctorId',
    'agencyId',
    'creditCustomerId',
    'minBalanceAllowed',
    'maxBalanceAllowed',
    'isActive',
  ] as const;
  const hasAtLeastOneField = updatableKeys.some((key) => key in data && data[key] !== undefined);
  if (!hasAtLeastOneField) {
    return { success: false, error: 'At least one field is required to update the account.' };
  }

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
        ...('minBalanceAllowed' in data && { minBalanceAllowed: data.minBalanceAllowed ?? null }),
        ...('maxBalanceAllowed' in data && { maxBalanceAllowed: data.maxBalanceAllowed ?? null }),
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
