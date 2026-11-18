'use server';

import { channelingUserJson, ChannelingUserApiError } from '@/lib/channeling-user-api';
import type {
  MovementRow,
  RoomInventoryData,
  RoomInventoryResult
} from '@/types/room-inventory';

/**
 * Room inventory for the management app. Every call goes to channeling as the signed-in user;
 * channeling checks room-inventory.view / .assign itself, so nothing here grants access.
 */

function failure(error: unknown): { success: false; errorCode: string; message: string } {
  if (error instanceof ChannelingUserApiError) {
    return { success: false, errorCode: error.status === 401 ? 'unauthorized' : 'unavailable', message: error.message };
  }
  console.error('[management room-inventory]', error);
  return { success: false, errorCode: 'unavailable', message: 'Could not reach channeling. Please try again.' };
}

export async function getRoomInventoryAction(locationId: string | null): Promise<RoomInventoryResult<RoomInventoryData>> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
  try {
    return await channelingUserJson<RoomInventoryResult<RoomInventoryData>>(`/api/management/room-inventory${qs}`);
  } catch (error) {
    return failure(error);
  }
}

export async function moveUnitsAction(input: {
  unitIds: string[];
  toRoomId: string | null;
  storeLocationId?: string | null;
}): Promise<RoomInventoryResult<{ moved: number }>> {
  if (!input.unitIds?.length) return { success: false, errorCode: 'invalid_input', message: 'Choose at least one item.' };
  try {
    return await channelingUserJson(`/api/management/room-inventory/move`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  } catch (error) {
    return failure(error);
  }
}

export async function setConditionAction(input: {
  unitIds: string[];
  condition: number;
  note?: string | null;
}): Promise<RoomInventoryResult<{ changed: number }>> {
  if (!input.unitIds?.length) return { success: false, errorCode: 'invalid_input', message: 'Choose at least one item.' };
  try {
    return await channelingUserJson(`/api/management/room-inventory/condition`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  } catch (error) {
    return failure(error);
  }
}

export async function unitHistoryAction(unitId: string): Promise<RoomInventoryResult<MovementRow[]>> {
  if (!/^[a-f0-9]{24}$/i.test(unitId ?? '')) return { success: false, errorCode: 'invalid_input', message: 'Invalid unit.' };
  try {
    return await channelingUserJson(`/api/management/room-inventory/units/${unitId}/history`);
  } catch (error) {
    return failure(error);
  }
}
