'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllCreditCustomersService,
  getCreditCustomerByIdService,
  createCreditCustomerService,
  updateCreditCustomerService,
  deleteCreditCustomerByIdService,
  bulkDeleteCreditCustomersService,
  getAllCreditCustomersOptionsService,
  getAllCreditCustomersExportService,
} from '@/services/credit-customer.service';
import { getOrCreateAccount } from '@/services/accounting/account.service';
import prisma from '@/lib/prisma';
import type {
  GetCreditCustomersParams,
  GetCreditCustomersQuery,
  CreditCustomerFormValues,
  UpdateCreditCustomerPayload,
  CreditCustomer,
} from '@/types/credit-customer';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';

// ==== GET ALL ==== //
export async function getAllCreditCustomers(
  params: GetCreditCustomersParams
): Promise<{
  success: boolean;
  message?: string;
  data: CreditCustomer[];
  totalRecords: number;
}> {
  await requirePermission('credit-customers', 'view');
  try {
    const query: GetCreditCustomersQuery = {
      page: params.page ? parseInt(params.page, 10) : 0,
      limit: params.limit
        ? parseInt(params.limit, 10)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10', 10),
      keyword: params.keyword ?? '',
    };
    const response = await getAllCreditCustomersService(query);
    if (!response.success) {
      return {
        success: false,
        message: response.error?.message ?? 'Failed to fetch credit customers',
        data: [],
        totalRecords: 0,
      };
    }
    return {
      success: true,
      data: response.data?.records ?? [],
      totalRecords: response.data?.totalRecords ?? 0,
      message: response.message,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error getting credit customers';
    return { success: false, message, data: [], totalRecords: 0 };
  }
}

// ==== GET OPTIONS (for dropdowns) ==== //
export async function getAllCreditCustomersOptions(): Promise<{
  success: boolean;
  data: { id: string; name: string; code: string | null }[];
  message?: string;
}> {
  await requirePermission('credit-customers', 'view');
  try {
    const response = await getAllCreditCustomersOptionsService();
    return {
      success: response.success,
      data: response.data ?? [],
      message: response.error?.message,
    };
  } catch (e: unknown) {
    return {
      success: false,
      data: [],
      message: e instanceof Error ? e.message : 'Error getting credit customer options',
    };
  }
}

// ==== GET BY ID ==== //
export async function getCreditCustomerById(id: string) {
  await requirePermission('credit-customers', 'view');
  try {
    const result = await getCreditCustomerByIdService(id);
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? { message: result.message ?? 'Failed to fetch credit customer' },
        data: null,
      };
    }
    return { success: true, data: result.data, message: result.message };
  } catch (e: unknown) {
    return {
      success: false,
      error: { message: e instanceof Error ? e.message : 'Unexpected error' },
      data: null,
    };
  }
}

// ==== CREATE ==== //
export async function createCreditCustomer(payload: CreditCustomerFormValues) {
  console.debug('[CC] Action: createCreditCustomer called', {
    name: payload.name,
    codeProvided: !!payload.code?.trim(),
    code: payload.code?.trim() || '(auto)',
  });
  await requirePermission('credit-customers', 'add');
  try {
    const result = await createCreditCustomerService(payload);
    if (!result.success) {
      const errMsg = result.error?.message ?? result.message ?? 'Creation failed';
      console.error('[CC] Action: service returned error', errMsg, result.error?.issues ?? '');
      return {
        success: false,
        isError: true,
        errors: result.error ?? { message: errMsg },
        data: null,
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'credit-customers.creditCustomer.created',
        entityType: 'CreditCustomer',
        entityId: result.data?.id ?? undefined,
        importance: 'high',
      });
    }
    console.debug('[CC] Action: service success', { id: result.data?.id, code: (result.data as { code?: string })?.code });
    revalidatePath('/credit-customers');
    return {
      success: true,
      data: result.data,
      message: result.message ?? 'Credit customer created successfully',
      isError: false,
      errors: {},
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('[CC] Action: exception', message, e);
    return {
      success: false,
      isError: true,
      data: null,
      errors: { message },
    };
  }
}

// ==== UPDATE ==== //
export async function updateCreditCustomer(id: string, payload: UpdateCreditCustomerPayload) {
  await requirePermission('credit-customers', 'edit');
  try {
    const result = await updateCreditCustomerService(id, payload);
    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error ?? { message: result.message ?? 'Update failed' },
        data: null,
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'credit-customers.creditCustomer.updated',
        entityType: 'CreditCustomer',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/credit-customers');
    revalidatePath(`/credit-customers/${id}/edit`);
    return {
      success: true,
      data: result.data,
      message: result.message ?? 'Credit customer updated successfully',
      isError: false,
      errors: {},
    };
  } catch (e: unknown) {
    return {
      success: false,
      isError: true,
      data: null,
      errors: { message: e instanceof Error ? e.message : 'Unexpected error' },
    };
  }
}

// ==== DELETE ==== //
export async function deleteCreditCustomer(id: string) {
  await requirePermission('credit-customers', 'delete');
  try {
    const result = await deleteCreditCustomerByIdService(id);
    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error ?? { message: result.message ?? 'Delete failed' },
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'credit-customers.creditCustomer.deleted',
        entityType: 'CreditCustomer',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/credit-customers');
    return { success: true, message: result.message, isError: false, errors: {} };
  } catch (e: unknown) {
    return {
      success: false,
      isError: true,
      errors: { message: e instanceof Error ? e.message : 'Unexpected error' },
    };
  }
}

// ==== BULK DELETE ==== //
export async function bulkDeleteCreditCustomers(ids: string[]) {
  await requirePermission('credit-customers', 'delete');
  try {
    const result = await bulkDeleteCreditCustomersService(ids);
    if (!result.success) throw new Error(result.error?.message ?? 'Bulk delete failed');
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'credit-customers.creditCustomers.bulkDeleted',
        entityType: 'CreditCustomer',
        importance: 'high',
        metadata: { count: ids.length },
      });
    }
    revalidatePath('/credit-customers');
    return true;
  } catch (e: unknown) {
    throw e;
  }
}

// ==== EXPORT ==== //
export async function getCreditCustomersExport(filters: { keyword?: string }): Promise<{
  success: boolean;
  message?: string;
  data?: CreditCustomer[];
  totalRecords?: number;
}> {
  await requirePermission('credit-customers', 'view');
  try {
    const response = await getAllCreditCustomersExportService(filters.keyword);
    if (!response.success || !response.data?.length) {
      return {
        success: false,
        message: response.success ? 'No credit customers found' : response.error?.message,
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'credit-customers.exported',
        entityType: 'CreditCustomer',
        importance: 'medium',
        metadata: { count: response.data?.length ?? 0 },
      });
    }
    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords ?? response.data.length,
    };
  } catch (e: unknown) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Error exporting credit customers',
    };
  }
}

// ==== CREATE GL ACCOUNT (for existing credit customer without one) ==== //
export async function createCreditCustomerAccount(creditCustomerId: string) {
  await requirePermission('credit-customers', 'edit');
  try {
    const cc = await prisma.creditCustomer.findUnique({
      where: { id: creditCustomerId },
      select: { id: true, name: true },
    });
    if (!cc) {
      return { success: false, message: 'Credit customer not found' };
    }
    const result = await getOrCreateAccount({
      type: 'RECEIVABLE',
      creditCustomerId: cc.id,
      name: `Credit - ${cc.name}`,
    });
    if (!result.success) {
      return { success: false, message: result.error ?? 'Failed to create GL account' };
    }
    revalidatePath('/credit-customers');
    revalidatePath(`/credit-customers/${creditCustomerId}/edit`);
    return { success: true, message: 'GL account created', accountId: result.account.id };
  } catch (e: unknown) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to create GL account',
    };
  }
}
