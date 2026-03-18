'use server';

import { requirePermission } from '@/lib/server-permissions';
import {
  getAllBankAccountsService,
  getBankAccountByIdService,
  createBankAccountService,
  updateBankAccountService,
  deleteBankAccountByIdService,
  bulkDeleteBankAccountsService,
  getBankOptionsService,
  getLocationOptionsService,
} from '@/services/bank-account.service';
import type { GetBankAccountsParams, BankAccountFormValues } from '@/types/bank-account';
import { revalidatePath } from 'next/cache';

export async function getAllBankAccounts(params: GetBankAccountsParams) {
  await requirePermission('bank-accounts', 'view');
  const page = params.page ? parseInt(params.page, 10) : 0;
  const limit = params.limit ? parseInt(params.limit, 10) : parseInt(process.env.DEFAULT_PER_PAGE ?? '10', 10);
  const res = await getAllBankAccountsService({
    page,
    limit,
    keyword: params.keyword ?? '',
    bankId: params.bankId ?? undefined,
    locationId: params.locationId ?? undefined,
  });
  if (!res.success) {
    return { data: [], totalRecords: 0 };
  }
  return {
    data: res.data?.records ?? [],
    totalRecords: res.data?.totalRecords ?? 0,
  };
}

export async function getBankAccountById(id: string) {
  await requirePermission('bank-accounts', 'view');
  return getBankAccountByIdService(id);
}

export async function createBankAccount(payload: BankAccountFormValues) {
  await requirePermission('bank-accounts', 'add');
  const res = await createBankAccountService(payload);
  if (res.success) revalidatePath('/bank-accounts');
  return res;
}

export async function updateBankAccount(id: string, payload: Partial<BankAccountFormValues>) {
  await requirePermission('bank-accounts', 'edit');
  const res = await updateBankAccountService(id, payload);
  if (res.success) revalidatePath('/bank-accounts');
  return res;
}

export async function deleteBankAccount(id: string) {
  await requirePermission('bank-accounts', 'delete');
  const res = await deleteBankAccountByIdService(id);
  if (res.success) revalidatePath('/bank-accounts');
  return res;
}

export async function bulkDeleteBankAccounts(ids: string[]): Promise<boolean> {
  await requirePermission('bank-accounts', 'delete');
  const res = await bulkDeleteBankAccountsService(ids);
  if (!res.success) throw new Error(res.error ?? 'Failed to delete bank accounts');
  revalidatePath('/bank-accounts');
  return true;
}

export async function getBankOptions() {
  await requirePermission('bank-accounts', 'view');
  return getBankOptionsService();
}

export async function getLocationOptions() {
  await requirePermission('bank-accounts', 'view');
  return getLocationOptionsService();
}
