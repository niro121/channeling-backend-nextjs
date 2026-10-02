import { channelingApi } from '@/lib/api';
import type {
  ChannelingLocationByIdResponse,
  ChannelingPublicLocationDto
} from '@/types/channeling-location';
import type { LocationPayload } from '@/types/location';

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
  const description = result.errorDescription || result.error;
  if (result.status === 409) {
    return {
      message:
        description ||
        'Cannot delete this location in Channeling because it has linked zones or rooms.'
    };
  }

  return {
    message:
      channelingAuthErrorMessage(result.status) ||
      description ||
      'Channeling request failed'
  };
}

type ChannelingCreateResponse = {
  location?: ChannelingPublicLocationDto & { id?: string; saved?: boolean };
};

export type ChannelingLocationWriteBody = LocationPayload & { code: string };

export function toChannelingLocationBody(payload: ChannelingLocationWriteBody) {
  return {
    name: payload.name,
    code: payload.code,
    addressLine1: payload.addressLine1 ?? '',
    addressLine2: payload.addressLine2 ?? '',
    city: payload.city ?? '',
    branchType: payload.branchType,
    status: payload.status,
    order: payload.order,
    color: payload.color ?? null
  };
}

/** Create a location in Channeling via the public API. */
export async function createChannelingLocation(
  payload: ChannelingLocationWriteBody
): Promise<{
  success: boolean;
  data?: { id: string };
  error?: { message?: string };
}> {
  const result = await channelingApi.post<ChannelingCreateResponse>(
    '/api/public/locations',
    toChannelingLocationBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  const channelingId = result.data?.location?.id;
  if (!channelingId) {
    return {
      success: false,
      error: { message: 'Channeling did not return a location id after create.' }
    };
  }

  return { success: true, data: { id: channelingId } };
}

/** Update a location in Channeling via the public API. */
export async function updateChannelingLocation(
  channelingLocationId: string,
  payload: ChannelingLocationWriteBody
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingLocationId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling location id is required' }
    };
  }

  const result = await channelingApi.patch<ChannelingLocationByIdResponse>(
    `/api/public/locations/${encodeURIComponent(trimmedId)}`,
    toChannelingLocationBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}

/** Delete a location in Channeling via the public API. */
export async function deleteChannelingLocation(
  channelingLocationId: string
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingLocationId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling location id is required' }
    };
  }

  const result = await channelingApi.delete<{ deleted?: boolean; id?: string }>(
    `/api/public/locations/${encodeURIComponent(trimmedId)}`,
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}
