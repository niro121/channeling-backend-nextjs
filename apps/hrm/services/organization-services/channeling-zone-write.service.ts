import { channelingApi } from '@/lib/api';
import type {
  ChannelingPublicZoneDto,
  ChannelingZoneByIdResponse
} from '@/types/channeling-zone';

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
        'Cannot delete this zone in Channeling because it has linked rooms.'
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
  zone?: ChannelingPublicZoneDto & { id?: string; saved?: boolean };
};

export type ChannelingZoneWriteBody = {
  name: string;
  description?: string;
  /** Channeling Location.id */
  locationId: string;
  status: number;
};

export function toChannelingZoneBody(payload: ChannelingZoneWriteBody) {
  return {
    name: payload.name,
    description: payload.description ?? '',
    locationId: payload.locationId,
    status: payload.status
  };
}

/** Create a zone in Channeling via the public API. */
export async function createChannelingZone(
  payload: ChannelingZoneWriteBody
): Promise<{
  success: boolean;
  data?: { id: string };
  error?: { message?: string };
}> {
  const result = await channelingApi.post<ChannelingCreateResponse>(
    '/api/public/zones',
    toChannelingZoneBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  const channelingId = result.data?.zone?.id;
  if (!channelingId) {
    return {
      success: false,
      error: { message: 'Channeling did not return a zone id after create.' }
    };
  }

  return { success: true, data: { id: channelingId } };
}

/** Update a zone in Channeling via the public API. */
export async function updateChannelingZone(
  channelingZoneId: string,
  payload: ChannelingZoneWriteBody
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingZoneId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling zone id is required' }
    };
  }

  const result = await channelingApi.patch<ChannelingZoneByIdResponse>(
    `/api/public/zones/${encodeURIComponent(trimmedId)}`,
    toChannelingZoneBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}

/** Delete a zone in Channeling via the public API. */
export async function deleteChannelingZone(
  channelingZoneId: string
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingZoneId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling zone id is required' }
    };
  }

  const result = await channelingApi.delete<{ deleted?: boolean; id?: string }>(
    `/api/public/zones/${encodeURIComponent(trimmedId)}`,
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}
