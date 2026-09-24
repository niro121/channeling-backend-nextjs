import { channelingApi } from '@/lib/api';
import type {
  ChannelingDepartmentByIdResponse,
  ChannelingPublicDepartmentDto
} from '@/types/channeling-department';
import type { DepartmentPayload } from '@/types/department';

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
  department?: ChannelingPublicDepartmentDto & { id?: string; saved?: boolean };
};

export function toChannelingDepartmentBody(payload: DepartmentPayload) {
  return {
    name: payload.name,
    description: payload.description ?? '',
    institution: payload.institution,
    status: payload.status
  };
}

/** Create a department in Channeling via the public API. */
export async function createChannelingDepartment(
  payload: DepartmentPayload
): Promise<{
  success: boolean;
  data?: { id: string };
  error?: { message?: string };
}> {
  const result = await channelingApi.post<ChannelingCreateResponse>(
    '/api/public/departments',
    toChannelingDepartmentBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  const channelingId = result.data?.department?.id;
  if (!channelingId) {
    return {
      success: false,
      error: { message: 'Channeling did not return a department id after create.' }
    };
  }

  return { success: true, data: { id: channelingId } };
}

/** Update a department in Channeling via the public API. */
export async function updateChannelingDepartment(
  channelingDepartmentId: string,
  payload: DepartmentPayload
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingDepartmentId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling department id is required' }
    };
  }

  const result = await channelingApi.patch<ChannelingDepartmentByIdResponse>(
    `/api/public/departments/${encodeURIComponent(trimmedId)}`,
    toChannelingDepartmentBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}

/** Delete a department in Channeling via the public API. */
export async function deleteChannelingDepartment(
  channelingDepartmentId: string
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingDepartmentId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling department id is required' }
    };
  }

  const result = await channelingApi.delete<{ deleted?: boolean; id?: string }>(
    `/api/public/departments/${encodeURIComponent(trimmedId)}`,
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}
