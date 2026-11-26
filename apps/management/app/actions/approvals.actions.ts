'use server';

import { channelingUserJson, ChannelingUserApiError } from '@/lib/channeling-user-api';
import type {
  ApprovalActionResult,
  ApprovalItem,
  ApprovalListResult,
  ApprovalTypeFilter,
  ApprovalView
} from '@/types/approvals';

/** Channeling serves slips at its own path; the browser loads them through our proxy route. */
function withLocalSlipUrls(result: ApprovalListResult): ApprovalListResult {
  if (!result.success) return result;
  return {
    ...result,
    data: result.data.map((item: ApprovalItem) => ({
      ...item,
      slipImageUrl: item.slipImageUrl ? `/api/approvals/${item.id}/slip` : null
    }))
  };
}

function failure(error: unknown): { success: false; errorCode: string; message: string } {
  if (error instanceof ChannelingUserApiError) {
    return { success: false, errorCode: error.status === 401 ? 'unauthorized' : 'unavailable', message: error.message };
  }
  console.error('[management approvals]', error);
  return { success: false, errorCode: 'unavailable', message: 'Could not reach channeling. Please try again.' };
}

export async function listApprovalsAction(input: {
  view?: ApprovalView;
  type?: ApprovalTypeFilter;
  status?: 'open' | 'all';
  page?: number;
  id?: string;
}): Promise<ApprovalListResult> {
  const params = new URLSearchParams();
  if (input.view) params.set('view', input.view);
  if (input.type) params.set('type', input.type);
  if (input.status) params.set('status', input.status);
  if (input.page) params.set('page', String(input.page));
  if (input.id) params.set('id', input.id);
  params.set('limit', '20');
  try {
    return withLocalSlipUrls(await channelingUserJson<ApprovalListResult>(`/api/management/approvals?${params}`));
  } catch (error) {
    return failure(error);
  }
}

async function postAction(id: string, action: 'approve' | 'reject' | 'withdraw', body?: unknown): Promise<ApprovalActionResult> {
  if (!id?.trim()) return { success: false, errorCode: 'invalid_input', message: 'Request id is required.' };
  try {
    return await channelingUserJson<ApprovalActionResult>(
      `/api/management/approvals/${encodeURIComponent(id)}/${action}`,
      { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }
    );
  } catch (error) {
    return failure(error);
  }
}

export async function approveApprovalAction(id: string) {
  return postAction(id, 'approve');
}

export async function rejectApprovalAction(id: string, reason: string) {
  return postAction(id, 'reject', { reason });
}

export async function withdrawApprovalAction(id: string) {
  return postAction(id, 'withdraw');
}
