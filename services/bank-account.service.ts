'use server';

import prisma from '@/lib/prisma';
import type { GetBankAccountsQuery, BankAccount, BankAccountFormValues } from '@/types/bank-account';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const TAG_TYPE_BANK = 4;
const TAG_STATUS_ACTIVE = 1;
const LOCATION_STATUS_ACTIVE = 1;

const bankAccountCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150, 'Max 150 characters'),
  accountNumber: z.string().min(1, 'Account number is required').max(100, 'Max 100 characters'),
  bankId: z.string().min(1, 'Bank is required'),
  locationId: z.string().min(1, 'Institution (location) is required'),
  status: z.coerce.number().int().refine((v) => v === 0 || v === 1, 'Status must be 0 or 1'),
});

const bankAccountUpdateSchema = bankAccountCreateSchema.partial().extend({
  id: z.string().min(1, 'ID is required'),
});

export type BankOption = { id: string; name: string };
export type LocationOption = { id: string; name: string; code: string };

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

export async function getLocationOptionsService(): Promise<{ success: boolean; data?: LocationOption[] }> {
  try {
    const rows = await prisma.location.findMany({
      where: { status: LOCATION_STATUS_ACTIVE },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    const data: LocationOption[] = rows.map((r) => ({ id: r.id, name: r.name, code: r.code }));
    return { success: true, data };
  } catch (e) {
    console.error('getLocationOptionsService error', e);
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
    if (query.locationId?.trim()) where.locationId = query.locationId.trim();

    const [rows, totalRecords] = await Promise.all([
      prisma.bankAccount.findMany({
        skip,
        take: validLimit,
        where,
        include: {
          bank: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, code: true } },
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
      locationId: r.locationId,
      location: r.location,
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
        location: { select: { id: true, name: true, code: true } },
      },
    });
    if (!row) return { success: false, error: 'Bank account not found' };
    return {
      success: true,
      data: {
        id: row.id,
        name: row.name,
        accountNumber: row.accountNumber,
        bankId: row.bankId,
        bank: row.bank,
        locationId: row.locationId,
        location: row.location,
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
        bankId: parsed.data.bankId,
        locationId: parsed.data.locationId,
        status: parsed.data.status,
      },
    });
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
    if (parsed.data.bankId !== undefined) data.bankId = parsed.data.bankId;
    if (parsed.data.locationId !== undefined) data.locationId = parsed.data.locationId;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    await prisma.bankAccount.update({ where: { id }, data });
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
