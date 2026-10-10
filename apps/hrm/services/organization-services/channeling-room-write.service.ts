import { channelingApi } from '@/lib/api';
import type {
  ChannelingPublicRoomDto,
  ChannelingRoomByIdResponse
} from '@/types/channeling-room';

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
        'Cannot delete this room in Channeling because it is occupied or linked to sessions.'
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
  room?: ChannelingPublicRoomDto & { id?: string; saved?: boolean };
};

export type ChannelingRoomWriteBody = {
  number: string;
  description?: string;
  locationId: string;
  zoneId: string;
  status: number;
};

export function toChannelingRoomBody(payload: ChannelingRoomWriteBody) {
  return {
    number: payload.number,
    description: payload.description ?? '',
    locationId: payload.locationId,
    zoneId: payload.zoneId,
    status: payload.status
  };
}

/** Create a room in Channeling via the public API. */
export async function createChannelingRoom(
  payload: ChannelingRoomWriteBody
): Promise<{
  success: boolean;
  data?: { id: string };
  error?: { message?: string };
}> {
  const result = await channelingApi.post<ChannelingCreateResponse>(
    '/api/public/rooms',
    toChannelingRoomBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  const channelingId = result.data?.room?.id;
  if (!channelingId) {
    return {
      success: false,
      error: { message: 'Channeling did not return a room id after create.' }
    };
  }

  return { success: true, data: { id: channelingId } };
}

/** Update a room in Channeling via the public API. */
export async function updateChannelingRoom(
  channelingRoomId: string,
  payload: ChannelingRoomWriteBody
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingRoomId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling room id is required' }
    };
  }

  const result = await channelingApi.patch<ChannelingRoomByIdResponse>(
    `/api/public/rooms/${encodeURIComponent(trimmedId)}`,
    toChannelingRoomBody(payload),
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}

/** Delete a room in Channeling via the public API. */
export async function deleteChannelingRoom(
  channelingRoomId: string
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const trimmedId = channelingRoomId?.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: { message: 'Channeling room id is required' }
    };
  }

  const result = await channelingApi.delete<{ deleted?: boolean; id?: string }>(
    `/api/public/rooms/${encodeURIComponent(trimmedId)}`,
    { cache: 'no-store' }
  );

  if (!result.success) {
    return { success: false, error: mapFailure(result) };
  }

  return { success: true };
}
