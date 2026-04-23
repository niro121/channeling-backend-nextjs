'use server';

import prisma from '@/lib/prisma';
import type { GetBankAccountsQuery, BankAccount, BankAccountFormValues } from '@/types/bank-account';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createAccount } from '@/services/accounting/account/write.service';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';
import { INSTITUTION_LIST, INSTITUTION_OPTIONS } from '@/types/institution';

const TAG_TYPE_BANK = 4;
const TAG_STATUS_ACTIVE = 1;
const INSTITUTION_CODE_BY_ID: Record<number, string> = {
  0: 'RH',
  1: 'RHD',
  2: 'RHT',
  3: 'RPS',
};
const INSTITUTION_NAME_BY_ID = new Map<number, string>(
  INSTITUTION_LIST.map((institution) => [institution.id, institution.name])
);

const bankAccountCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150, 'Max 150 characters'),
  accountNumber: z.string().min(1, 'Account number is required').max(100, 'Max 100 characters'),
  bankId: z.string().min(1, 'Bank is required'),
  institution: z.coerce.number().int().min(0).max(3),
  accountId: z.string().optional().nullable(),
  status: z.coerce.number().int().refine((v) => v === 0 || v === 1, 'Status must be 0 or 1'),
});

const bankAccountUpdateSchema = bankAccountCreateSchema.partial().extend({
  id: z.string().min(1, 'ID is required'),
});

export type BankOption = { id: string; name: string };
export type InstitutionOption = { id: string; name: string };
export type AccountOption = { id: string; name: string; code: string | null; locationId: string | null };
export type LedgerBankAccountOption = {
  id: string;
  name: string;
  accountNumber: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  glAccountId: string | null;
  glAccountName: string | null;
  glAccountCode: string | null;
};

function last4Digits(v: string): string {
  const digits = v.replace(/\D/g, '');
  return digits.slice(-4) || '0000';
}

function buildBankAccountGlCode(locationCode: string | null, bankAccountId: string, accountNumber: string): string {
  const suffix = bankAccountId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'AUTO00';
  const loc = (locationCode ?? 'LOC').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'LOC';
  return `BA-${loc}-${last4Digits(accountNumber)}-${suffix}`.slice(0, 50);
}

async function ensureBankAccountLinkedAccount(bankAccountId: string): Promise<{ success: true; accountId: string } | { success: false; error: string }> {
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: {
      bank: { select: { name: true } },
      account: { select: { id: true } },
    },
  });
  if (!bankAccount) return { success: false, error: 'Bank account not found.' };
  if (bankAccount.accountId && bankAccount.account?.id) return { success: true, accountId: bankAccount.account.id };

  const locationCode = INSTITUTION_CODE_BY_ID[bankAccount.institution] ?? null;
  const created = await createAccount({
    name: `Bank Account - ${bankAccount.name} (${bankAccount.bank?.name ?? 'Bank'})`,
    type: 'CASH',
    code: buildBankAccountGlCode(locationCode, bankAccount.id, bankAccount.accountNumber),
  });
  if (!created.success) return { success: false, error: created.error };

  await prisma.bankAccount.update({
    where: { id: bankAccount.id },
    data: { accountId: created.account.id },
  });
  return { success: true, accountId: created.account.id };
}

export async function getBankOptionsService(): Promise<{ success: boolean; data?: BankOption[] }> {
  try {
    const rows = await prisma.tag.findMany({
      where: { type: TAG_TYPE_BANK, status: TAG_STATUS_ACTIVE },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    const data: BankOption[] = rows.map((r) => ({ id: r.id, name: r.name ?? '' }));
    return { success: true, data };
  } catch (e) {
    console.error('getBankOptionsService error', e);
    return { success: false };
  }
}

export async function getInstitutionOptionsService(): Promise<{ success: boolean; data?: InstitutionOption[] }> {
  try {
    const data: InstitutionOption[] = INSTITUTION_OPTIONS;
    return { success: true, data };
  } catch (e) {
    console.error('getInstitutionOptionsService error', e);
    return { success: false };
  }
}

export async function getCashAccountOptionsService(): Promise<{ success: boolean; data?: AccountOption[] }> {
  try {
    const rows = await prisma.account.findMany({
      where: { type: 'CASH', isActive: true },
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, code: true, locationId: true },
    });
    const data: AccountOption[] = rows.map((r) => ({ id: r.id, name: r.name, code: r.code ?? null, locationId: r.locationId ?? null }));
    return { success: true, data };
  } catch (e) {
    console.error('getCashAccountOptionsService error', e);
    return { success: false };
  }
}

export async function getActiveBankAccountOptionsForLedgerService(): Promise<{ success: boolean; data?: LedgerBankAccountOption[] }> {
  try {
    const rows = await prisma.bankAccount.findMany({
      where: { status: 1 },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        institution: true,
        accountId: true,
        account: { select: { name: true, code: true } },
      },
      orderBy: [{ institution: 'asc' }, { name: 'asc' }],
    });
    const data: LedgerBankAccountOption[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      accountNumber: r.accountNumber,
      locationId: String(r.institution),
      locationName: INSTITUTION_NAME_BY_ID.get(r.institution) ?? `Institution ${r.institution}`,
      locationCode: INSTITUTION_CODE_BY_ID[r.institution] ?? String(r.institution),
      glAccountId: r.accountId ?? null,
      glAccountName: r.account?.name ?? null,
      glAccountCode: r.account?.code ?? null,
    }));
    return { success: true, data };
  } catch (e) {
    console.error('getActiveBankAccountOptionsForLedgerService error', e);
    return { success: false };
  }
}

export async function getAllBankAccountsService(
  query: GetBankAccountsQuery
): Promise<{ success: boolean; data?: { records: BankAccount[]; totalRecords: number }; error?: { message?: string; issues?: Record<string, string[]> } }> {
  const validLimit = query.limit > 0 ? query.limit : 10;
  const skip = query.page * validLimit;

  try {
    const where: Prisma.BankAccountWhereInput = {};

    if (query.keyword?.trim()) {
      where.OR = [
        { name: { contains: query.keyword.trim(), mode: 'insensitive' } },
        { accountNumber: { contains: query.keyword.trim(), mode: 'insensitive' } },
      ];
    }
    if (query.bankId?.trim()) where.bankId = query.bankId.trim();

    const [rows, totalRecords] = await Promise.all([
      prisma.bankAccount.findMany({
        skip,
        take: validLimit,
        where,
        include: {
          bank: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bankAccount.count({ where }),
    ]);

    const records: BankAccount[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      accountNumber: r.accountNumber,
      bankId: r.bankId,
      bank: r.bank,
      institution: r.institution,
      accountId: r.accountId ?? null,
      account: r.account ? { id: r.account.id, name: r.account.name, code: r.account.code ?? null } : null,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return { success: true, data: { records, totalRecords } };
  } catch (e) {
    console.error('getAllBankAccountsService error', e);
    return {
      success: false,
      error: { message: e instanceof Error ? e.message : 'Failed to fetch bank accounts' },
    };
  }
}

export async function getBankAccountByIdService(
  id: string
): Promise<{ success: boolean; data?: BankAccount; error?: string }> {
  try {
    const row = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        bank: { select: { id: true, name: true } },
        account: { select: { id: true, name: true, code: true } },
      },
    });
    if (!row) return { success: false, error: 'Bank account not found' };
    const balanceCents = row.accountId ? await getAccountBalance(row.accountId) : 0;
    return {
      success: true,
      data: {
        id: row.id,
        name: row.name,
        accountNumber: row.accountNumber,
        bankId: row.bankId,
        bank: row.bank,
        institution: row.institution,
        balance: balanceCents / 100,
        accountId: row.accountId ?? null,
        account: row.account ? { id: row.account.id, name: row.account.name, code: row.account.code ?? null } : null,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (e) {
    console.error('getBankAccountByIdService error', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch bank account' };
  }
}

export async function createBankAccountService(
  payload: BankAccountFormValues
): Promise<{ success: true; data: { id: string } } | { success: false; error: { message?: string; issues?: Record<string, string[]> } }> {
  const parsed = bankAccountCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { success: false, error: { message: 'Validation failed', issues } };
  }
  try {
    const created = await prisma.bankAccount.create({
      data: {
        name: parsed.data.name.trim(),
        accountNumber: parsed.data.accountNumber.trim(),
        bank: { connect: { id: parsed.data.bankId } },
        institution: parsed.data.institution,
        ...(parsed.data.accountId
          ? { account: { connect: { id: parsed.data.accountId } } }
          : {}),
        status: parsed.data.status,
      },
    });
    if (!parsed.data.accountId) {
      const linkResult = await ensureBankAccountLinkedAccount(created.id);
      if (!linkResult.success) {
        return {
          success: false,
          error: { message: `Bank account created, but linked GL account could not be created: ${linkResult.error}` },
        };
      }
    }
    return { success: true, data: { id: created.id } };
  } catch (e) {
    console.error('createBankAccountService error', e);
    return {
      success: false,
      error: { message: e instanceof Error ? e.message : 'Failed to create bank account' },
    };
  }
}

export async function updateBankAccountService(
  id: string,
  payload: Partial<BankAccountFormValues>
): Promise<{ success: true } | { success: false; error: { message?: string; issues?: Record<string, string[]> } }> {
  const parsed = bankAccountUpdateSchema.safeParse({ ...payload, id });
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { success: false, error: { message: 'Validation failed', issues } };
  }
  try {
    const data: Prisma.BankAccountUpdateInput = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.accountNumber !== undefined) data.accountNumber = parsed.data.accountNumber.trim();
    if (parsed.data.bankId !== undefined) data.bank = { connect: { id: parsed.data.bankId } };
    if (parsed.data.institution !== undefined) data.institution = parsed.data.institution;
    if (parsed.data.accountId !== undefined) data.account = parsed.data.accountId ? { connect: { id: parsed.data.accountId } } : { disconnect: true };
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    const updated = await prisma.bankAccount.update({ where: { id }, data, select: { id: true, accountId: true } });
    if (!updated.accountId) {
      const linkResult = await ensureBankAccountLinkedAccount(updated.id);
      if (!linkResult.success) {
        return {
          success: false,
          error: { message: `Bank account updated, but linked GL account could not be created: ${linkResult.error}` },
        };
      }
    }
    return { success: true };
  } catch (e) {
    console.error('updateBankAccountService error', e);
    return {
      success: false,
      error: { message: e instanceof Error ? e.message : 'Failed to update bank account' },
    };
  }
}

export async function deleteBankAccountByIdService(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.bankAccount.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    console.error('deleteBankAccountByIdService error', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to delete bank account' };
  }
}

export async function bulkDeleteBankAccountsService(ids: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.bankAccount.deleteMany({ where: { id: { in: ids } } });
    return { success: true };
  } catch (e) {
    console.error('bulkDeleteBankAccountsService error', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to delete bank accounts' };
  }
}

export async function createBankAccountLinkedAccountService(
  bankAccountId: string
): Promise<{ success: boolean; message: string; accountId?: string }> {
  try {
    const result = await ensureBankAccountLinkedAccount(bankAccountId);
    if (!result.success) return { success: false, message: result.error };
    return { success: true, message: 'Linked GL account is ready.', accountId: result.accountId };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to create linked GL account.' };
  }
}
