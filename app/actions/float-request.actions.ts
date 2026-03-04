'use server';

import { z } from 'zod';
import {
  getBulkCashierUsers,
  createFloatRequest,
  getFloatRequestsForBulkCashier,
  getFloatRequestById,
  getPendingFloatRequestByUserId,
  approveFloatRequest,
  rejectFloatRequest,
  cancelFloatRequest,
} from '@/services/float-request.service';
import { getAllAccounts, getCashierFloatBalance } from '@/services/accounting.service';
import {
  denominationsTotalLKR,
  lkrToCents,
} from '@/types/float-request';
import type {
  CreateFloatRequestInput,
  ApproveFloatRequestInput,
  RejectFloatRequestInput,
  CancelFloatRequestInput,
} from '@/types/float-request';
import { requirePermission } from '@/lib/server-permissions';
import { revalidatePath } from 'next/cache';

const denominationEntrySchema = z.object({
  value: z.number(),
  count: z.number().int().min(0),
});

const createFloatRequestSchema = z.object({
  bulkCashierId: z.string().min(1, 'Bulk cashier is required'),
  amountRequested: z.number().int().min(1, 'Amount must be at least 1 cent'),
  denominationsRequested: z.array(denominationEntrySchema),
  shiftId: z.string().nullable().optional(),
}).refine(
  (data) => {
    const totalLKR = data.denominationsRequested.reduce((s, d) => s + d.value * d.count, 0);
    const cents = Math.round(totalLKR * 100);
    return cents > 0 && cents === data.amountRequested;
  },
  { message: 'Amount must match the sum of denominations and be greater than zero' }
);

const cancelFloatRequestSchema = z.object({
  floatRequestId: z.string().min(1, 'Float request is required'),
  reason: z.string().min(1, 'Cancel reason is required'),
});

const approveFloatRequestSchema = z.object({
  floatRequestId: z.string().min(1, 'Float request is required'),
  approvedBy: z.string().min(1, 'Approver is required'),
  fromAccountId: z.string().min(1, 'From account is required'),
  denominationsApproved: z.array(denominationEntrySchema).min(1, 'At least one denomination with count > 0 is required'),
  reasonForLessThanRequested: z.string().optional().nullable(),
});

const rejectFloatRequestSchema = z.object({
  floatRequestId: z.string().min(1, 'Float request is required'),
  rejectedBy: z.string().min(1, 'Rejector is required'),
  reason: z.string().min(1, 'Reject reason is required'),
});

/** Cash accounts for bulk cashier to select "from account" when approving float */
export async function getCashAccountsForFloatAction() {
  await requirePermission('bulk-cashier', 'bulk-cashier-dashboard');
  try {
    const result = await getAllAccounts({ type: 'CASH', limit: 200 });
    if (!result.success) return { success: false, data: [] };
    return { success: true, data: result.data ?? [] };
  } catch (e) {
    console.error('getCashAccountsForFloatAction error:', e);
    return { success: false, data: [] };
  }
}

/** Current user's float balance (cashier CASH account) in smallest unit; 0 if no account yet. Requires float-request permission. */
export async function getMyFloatBalanceAction() {
  const { requirePermission } = await import('@/lib/server-permissions');
  const { fetchServerSession } = await import('@/lib/session');
  await requirePermission('shift', 'view');
  await requirePermission('bulk-cashier', 'float-request');
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

/** Current user's pending float request (if any). Requires float-request permission. */
export async function getMyPendingFloatRequestAction() {
  await requirePermission('shift', 'view');
  await requirePermission('bulk-cashier', 'float-request');
  const session = await import('@/lib/session').then((m) => m.fetchServerSession());
  const userId = session?.user?.id;
  if (!userId) return { success: true, data: null };
  try {
    const pending = await getPendingFloatRequestByUserId(userId);
    return { success: true, data: pending };
  } catch (e) {
    console.error('getMyPendingFloatRequestAction error:', e);
    return { success: true, data: null };
  }
}

/** List users who can approve float (Float Approve permission). Requires float-request permission. */
export async function getBulkCashierUsersAction() {
  await requirePermission('bulk-cashier', 'float-request');
  try {
    const users = await getBulkCashierUsers();
    return { success: true, data: users };
  } catch (e) {
    console.error('getBulkCashierUsersAction error:', e);
    return { success: false, data: [], message: e instanceof Error ? e.message : 'Failed to load bulk cashiers' };
  }
}

export async function createFloatRequestAction(input: unknown) {
  await requirePermission('shift', 'view');
  await requirePermission('bulk-cashier', 'float-request');
  const parsed = createFloatRequestSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
      ? Object.entries(parsed.error.flatten().fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join('; ')
      : parsed.error.issues[0]?.message ?? 'Invalid input';
    return { success: false, error: msg, data: null };
  }
  const session = await import('@/lib/session').then((m) => m.fetchServerSession());
  const requestedById = session?.user?.id;
  if (!requestedById) {
    return { success: false, error: 'Unauthorized', data: null };
  }
  try {
    const result = await createFloatRequest({ ...parsed.data, requestedById });
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
  await requirePermission('bulk-cashier', 'bulk-cashier-dashboard');
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

/** Approve a pending float request. Requires float-approve permission. Only PENDING requests; approved total must not exceed requested. */
export async function approveFloatRequestAction(input: unknown) {
  try {
    await requirePermission('bulk-cashier', 'float-approve');
  } catch {
    return { success: false, error: 'You do not have permission to approve float requests.', data: null };
  }
  const parsed = approveFloatRequestSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
      ? Object.entries(parsed.error.flatten().fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join('; ')
      : parsed.error.issues[0]?.message ?? 'Invalid input';
    return { success: false, error: msg, data: null };
  }
  const fr = await getFloatRequestById(parsed.data.floatRequestId);
  if (!fr) return { success: false, error: 'Float request not found', data: null };
  if (fr.status !== 'PENDING') {
    return { success: false, error: 'Only pending requests can be approved. This request has already been approved, rejected, or cancelled.', data: null };
  }
  const approvedTotalCents = lkrToCents(denominationsTotalLKR(parsed.data.denominationsApproved));
  if (approvedTotalCents <= 0) {
    return { success: false, error: 'Approved amount must be greater than zero', data: null };
  }
  if (approvedTotalCents > fr.amountRequested) {
    return { success: false, error: 'Cannot give more than requested. Approved total must not exceed the requested amount.', data: null };
  }
  if (approvedTotalCents < fr.amountRequested) {
    const reason = parsed.data.reasonForLessThanRequested;
    if (!reason || !String(reason).trim()) {
      return { success: false, error: 'Reason for giving less than requested is required when approved amount is below the requested amount.', data: null };
    }
  }
  try {
    const result = await approveFloatRequest({
      ...parsed.data,
      reasonForLessThanRequested: parsed.data.reasonForLessThanRequested?.trim() || null,
    });
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

/** Reject a pending float request. Requires float-approve permission. Only PENDING requests. */
export async function rejectFloatRequestAction(input: unknown) {
  try {
    await requirePermission('bulk-cashier', 'float-approve');
  } catch {
    return { success: false, error: 'You do not have permission to reject float requests.', data: null };
  }
  const parsed = rejectFloatRequestSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
      ? Object.entries(parsed.error.flatten().fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join('; ')
      : parsed.error.issues[0]?.message ?? 'Invalid input';
    return { success: false, error: msg, data: null };
  }
  const fr = await getFloatRequestById(parsed.data.floatRequestId);
  if (!fr) return { success: false, error: 'Float request not found', data: null };
  if (fr.status !== 'PENDING') {
    return { success: false, error: 'Only pending requests can be rejected.', data: null };
  }
  try {
    const result = await rejectFloatRequest(parsed.data);
    if (!result.success) return { success: false, error: result.error, data: null };
    revalidatePath('/bulk-cashier');
    revalidatePath('/channel-booking');
    return { success: true, data: result.floatRequest, message: 'Float request rejected' };
  } catch (e) {
    console.error('rejectFloatRequestAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to reject', data: null };
  }
}

/** Cancel a pending float request. Only the requester can cancel; only PENDING requests. */
export async function cancelFloatRequestAction(input: unknown) {
  await requirePermission('shift', 'view');
  await requirePermission('bulk-cashier', 'float-request');
  const parsed = cancelFloatRequestSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
      ? Object.entries(parsed.error.flatten().fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join('; ')
      : parsed.error.issues[0]?.message ?? 'Invalid input';
    return { success: false, error: msg, data: null };
  }
  const session = await import('@/lib/session').then((m) => m.fetchServerSession());
  const cancelledBy = session?.user?.id;
  if (!cancelledBy) return { success: false, error: 'Unauthorized', data: null };

  const fr = await getFloatRequestById(parsed.data.floatRequestId);
  if (!fr) return { success: false, error: 'Float request not found', data: null };
  if (fr.status !== 'PENDING') {
    return { success: false, error: 'Only pending requests can be cancelled. This request has already been approved or rejected.', data: null };
  }
  if (fr.requestedById !== cancelledBy) {
    return { success: false, error: 'Only the requester can cancel their own float request.', data: null };
  }

  try {
    const result = await cancelFloatRequest({
      floatRequestId: parsed.data.floatRequestId,
      cancelledBy,
      reason: parsed.data.reason.trim(),
    });
    if (!result.success) return { success: false, error: result.error, data: null };
    revalidatePath('/bulk-cashier');
    revalidatePath('/channel-booking');
    return { success: true, data: result.floatRequest, message: 'Float request cancelled' };
  } catch (e) {
    console.error('cancelFloatRequestAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to cancel', data: null };
  }
}
