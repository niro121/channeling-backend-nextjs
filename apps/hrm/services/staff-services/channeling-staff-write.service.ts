import { channelingApi } from '@/lib/api';
import {
  toChannelingStaffBody,
  type ChannelingStaffWriteBody
} from '@/lib/helpers/staff-channeling-fields.helper';
import type { Staff } from '@archmage/shared';
import type {
  ChannelingPublicStaffDto,
  ChannelingStaffByIdResponse
} from '@/types/channeling-staff';

function channelingAuthErrorMessage(status: number): string | undefined {
  if (status !== 401) return undefined;

  return (
    'Channeling rejected the API credentials. Verify CHANNELING_API_CLIENT_ID and ' +
    'CHANNELING_API_CLIENT_SECRET in HRM .env match an active API client in Channeling.'
  );
}

function mapFailure(result: {
  status: number;
  error: string;
  errorDescription?: string;
}): { message: string } {
  return {
    message:
      channelingAuthErrorMessage(result.status) ||
      result.errorDescription ||
      result.error ||
      'Channeling request failed'
  };
}

type ChannelingCreateResponse = {
  staff?: ChannelingPublicStaffDto & { id?: string; saved?: boolean };
};

type ChannelingBulkDeleteResponse = {
  deleted?: boolean;
  count?: number;
};

/** Create a staff record in Channeling via the public API. */
export async function createChannelingStaff(
  staff: Partial<Staff>
): Promise<{
  success: boolean;
  data?: { id: string };
  error?: { message?: string };
}> {
  const body = toChannelingStaffBody(staff) as ChannelingStaffWriteBody;
  const result = await channelingApi.post<ChannelingCreateResponse>(
    '/api/public/staff',
    body,
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  const channelingId = result.data?.staff?.id;
  if (!channelingId) {
    return {
      success: false,
      error: { message: 'Channeling did not return a staff id after create.' }
    };
  }

  return { success: true, data: { id: channelingId } };
}

/** Update a staff record in Channeling via the public API. */
export async function updateChannelingStaff(
  channelingStaffId: string,
  staff: Partial<Staff>
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingStaffId?.trim();
  if (!trimmedId) {
    return { success: false, error: { message: 'Channeling staff id is required' } };
  }

  const body = toChannelingStaffBody(staff);
  const result = await channelingApi.patch<ChannelingStaffByIdResponse>(
    `/api/public/staff/${encodeURIComponent(trimmedId)}`,
    body,
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}

/** Delete a staff record in Channeling via the public API. */
export async function deleteChannelingStaff(channelingStaffId: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingStaffId?.trim();
  if (!trimmedId) {
    return { success: false, error: { message: 'Channeling staff id is required' } };
  }

  const result = await channelingApi.delete<{ deleted?: boolean; id?: string }>(
    `/api/public/staff/${encodeURIComponent(trimmedId)}`,
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}

/** Bulk delete staff records in Channeling via the public API. */
export async function bulkDeleteChannelingStaff(channelingStaffIds: string[]): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const ids = channelingStaffIds.map((id) => id.trim()).filter(Boolean);
  if (!ids.length) {
    return { success: true };
  }

  const result = await channelingApi.post<ChannelingBulkDeleteResponse>(
    '/api/public/staff/bulk-delete',
    { ids },
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}
