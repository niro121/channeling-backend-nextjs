'use server';

import {
  getBulkCashierUsers,
  createFloatRequest,
  getFloatRequestsForBulkCashier,
  getFloatRequestById,
  approveFloatRequest,
  rejectFloatRequest,
  cancelFloatRequest,
} from '@/services/float-request.service';
import { getAllAccounts, getCashierFloatBalance } from '@/services/accounting.service';
import type {
  CreateFloatRequestInput,
  ApproveFloatRequestInput,
  RejectFloatRequestInput,
  CancelFloatRequestInput,
} from '@/types/float-request';
import { requirePermission } from '@/lib/server-permissions';
import { revalidatePath } from 'next/cache';

/** Cash accounts for bulk cashier to select "from account" when approving float */
export async function getCashAccountsForFloatAction() {
  await requirePermission('bulk-cashier', 'edit');
  try {
    const result = await getAllAccounts({ type: 'CASH', limit: 200 });
    if (!result.success) return { success: false, data: [] };
    return { success: true, data: result.data ?? [] };
  } catch (e) {
    console.error('getCashAccountsForFloatAction error:', e);
    return { success: false, data: [] };
  }
}

/** Current user's float balance (cashier CASH account) in smallest unit; 0 if no account yet */
export async function getMyFloatBalanceAction() {
  const { requirePermission } = await import('@/lib/server-permissions');
  const { fetchServerSession } = await import('@/lib/session');
  await requirePermission('shift', 'view');
  const session = await fetchServerSession();
  const userId = session?.user?.id;
  if (!userId) return { success: true, balanceCents: 0 };
  try {
    const balanceCents = await getCashierFloatBalance(userId);
    return { success: true, balanceCents };
  } catch (e) {
    console.error('getMyFloatBalanceAction error:', e);
    return { success: true, balanceCents: 0 };
  }
}

export async function getBulkCashierUsersAction() {
  try {
    const users = await getBulkCashierUsers();
    return { success: true, data: users };
  } catch (e) {
    console.error('getBulkCashierUsersAction error:', e);
    return { success: false, data: [], message: e instanceof Error ? e.message : 'Failed to load bulk cashiers' };
  }
}

export async function createFloatRequestAction(input: Omit<CreateFloatRequestInput, 'requestedById'>) {
  await requirePermission('shift', 'view');
  const session = await import('@/lib/session').then((m) => m.fetchServerSession());
  const requestedById = session?.user?.id;
  if (!requestedById) {
    return { success: false, error: 'Unauthorized', data: null };
  }
  try {
    const result = await createFloatRequest({ ...input, requestedById });
    if (!result.success) return { success: false, error: result.error, data: null };
    revalidatePath('/channel-booking');
    revalidatePath('/bulk-cashier');
    return { success: true, data: result.floatRequest, message: 'Float request submitted' };
  } catch (e) {
    console.error('createFloatRequestAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create request', data: null };
  }
}

export async function getFloatRequestsForBulkCashierAction(
  bulkCashierId: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
) {
  await requirePermission('bulk-cashier', 'edit');
  try {
    const list = await getFloatRequestsForBulkCashier(bulkCashierId, status);
    return { success: true, data: list };
  } catch (e) {
    console.error('getFloatRequestsForBulkCashierAction error:', e);
    return { success: false, data: [], message: e instanceof Error ? e.message : 'Failed to load requests' };
  }
}

export async function getFloatRequestByIdAction(id: string) {
  try {
    const fr = await getFloatRequestById(id);
    return { success: true, data: fr };
  } catch (e) {
    console.error('getFloatRequestByIdAction error:', e);
    return { success: false, data: null };
  }
}

export async function approveFloatRequestAction(input: ApproveFloatRequestInput) {
  await requirePermission('bulk-cashier', 'add');
  try {
    const result = await approveFloatRequest(input);
    if (!result.success) {
      return { success: false, error: result.error, errorCode: result.errorCode, data: null };
    }
    revalidatePath('/bulk-cashier');
    revalidatePath('/channel-booking');
    return { success: true, data: result.floatRequest, message: 'Float request approved' };
  } catch (e) {
    console.error('approveFloatRequestAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to approve', data: null };
  }
}

export async function rejectFloatRequestAction(input: RejectFloatRequestInput) {
  await requirePermission('bulk-cashier', 'add');
  try {
    const result = await rejectFloatRequest(input);
    if (!result.success) return { success: false, error: result.error, data: null };
    revalidatePath('/bulk-cashier');
    revalidatePath('/channel-booking');
    return { success: true, data: result.floatRequest, message: 'Float request rejected' };
  } catch (e) {
    console.error('rejectFloatRequestAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to reject', data: null };
  }
}

export async function cancelFloatRequestAction(input: CancelFloatRequestInput) {
  try {
    const result = await cancelFloatRequest(input);
    if (!result.success) return { success: false, error: result.error, data: null };
    revalidatePath('/bulk-cashier');
    revalidatePath('/channel-booking');
    return { success: true, data: result.floatRequest, message: 'Float request cancelled' };
  } catch (e) {
    console.error('cancelFloatRequestAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to cancel', data: null };
  }
}
