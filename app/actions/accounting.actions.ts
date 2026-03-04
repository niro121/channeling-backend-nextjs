'use server';

import {
  getAllAccounts,
  getAccountById as getAccountByIdService,
  createAccount as createAccountService,
  getAccountStatement as getAccountStatementService,
  getMainCashBookAccount,
  getBranchCashBalance,
  getFullInstituteCashBalance,
  type GetAllAccountsParams,
} from '@/services/accounting.service';
import type { CreateAccountInput } from '@/types/accounting';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';

export type GetAccountsParams = {
  page?: string | number;
  limit?: string | number;
  type?: string | null;
  locationId?: string | null;
  keyword?: string | null;
};

export async function getAccounts(params: GetAccountsParams = {}) {
  await requirePermission('accounting', 'view');

  try {
    const query: GetAllAccountsParams = {
      page: params.page != null ? Number(params.page) : 0,
      limit:
        params.limit != null
          ? Number(params.limit)
          : Number(process.env.DEFAULT_PER_PAGE ?? '10'),
      type: (params.type as GetAllAccountsParams['type']) ?? undefined,
      locationId: params.locationId ?? undefined,
      keyword: params.keyword ?? undefined,
    };

    const response = await getAllAccounts(query);

    if (!response.success) {
      return {
        success: false,
        message: response.error ?? 'Failed to fetch accounts',
        data: [],
        totalRecords: 0,
      };
    }

    return {
      success: true,
      data: response.data ?? [],
      totalRecords: response.totalRecords ?? 0,
    };
  } catch (error: unknown) {
    console.error('getAccounts action error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error loading accounts',
      data: [],
      totalRecords: 0,
    };
  }
}

export async function getAccountById(id: string) {
  await requirePermission('accounting', 'view');

  try {
    const account = await getAccountByIdService(id);
    return { success: true, data: account };
  } catch (error: unknown) {
    console.error('getAccountById action error:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Error loading account',
    };
  }
}

export async function createAccount(payload: CreateAccountInput) {
  await requirePermission('accounting', 'add');

  try {
    const result = await createAccountService(payload);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        data: null,
      };
    }

    revalidatePath('/accounting');
    return {
      success: true,
      data: result.account,
      message: 'Account created successfully',
    };
  } catch (error: unknown) {
    console.error('createAccount action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account',
      data: null,
    };
  }
}

export async function getAccountStatement(
  accountId: string,
  fromDate?: string | Date,
  toDate?: string | Date
) {
  await requirePermission('accounting', 'view');

  try {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    const statement = await getAccountStatementService(accountId, from, to);
    return { success: true, data: statement };
  } catch (error: unknown) {
    console.error('getAccountStatement action error:', error);
    return {
      success: false,
      data: null,
      message:
        error instanceof Error ? error.message : 'Error loading statement',
    };
  }
}

export async function getMainCashBook() {
  await requirePermission('accounting', 'view');
  try {
    const account = await getMainCashBookAccount();
    return { success: true, data: account };
  } catch (error: unknown) {
    console.error('getMainCashBook action error:', error);
    return { success: false, data: null };
  }
}

export async function getBranchBalance(locationId: string) {
  await requirePermission('accounting', 'view');
  try {
    const balance = await getBranchCashBalance(locationId);
    return { success: true, data: balance };
  } catch (error: unknown) {
    console.error('getBranchBalance action error:', error);
    return { success: false, data: 0 };
  }
}

export async function getInstituteCashBalance() {
  await requirePermission('accounting', 'view');
  try {
    const balance = await getFullInstituteCashBalance();
    return { success: true, data: balance };
  } catch (error: unknown) {
    console.error('getInstituteCashBalance action error:', error);
    return { success: false, data: 0 };
  }
}
