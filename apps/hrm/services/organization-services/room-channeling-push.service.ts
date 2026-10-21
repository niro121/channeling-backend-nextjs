'use server';

import prisma from '@/lib/prisma';
import {
  createChannelingRoom,
  deleteChannelingRoom,
  updateChannelingRoom
} from '@/services/organization-services/channeling-room-write.service';
import { setRoomMigrateSourceId } from '@/services/organization-services/room.service';
import type { RoomPayload } from '@/types/room';

function requireChannelingId(
  id: string | null | undefined,
  label: string
): { success: true; id: string } | { success: false; message: string } {
  const trimmed = id?.trim();
  if (!trimmed) {
    return {
      success: false,
      message: `The selected ${label} is not linked to Channeling. Refresh ${label === 'location' ? 'Locations' : 'Zones'} first, then try again.`
    };
  }
  return { success: true, id: trimmed };
}

/** Push create to Channeling and store migrateSourceId on the HRM record. */
export async function pushRoomCreateToChanneling(
  hrmRoomId: string,
  payload: RoomPayload,
  channelingLocationId: string | null | undefined,
  channelingZoneId: string | null | undefined
): Promise<{
  success: boolean;
  data?: { channelingId: string };
  error?: { message?: string };
}> {
  const locationCheck = requireChannelingId(channelingLocationId, 'location');
  if (!locationCheck.success) {
    return { success: false, error: { message: locationCheck.message } };
  }

  const zoneCheck = requireChannelingId(channelingZoneId, 'zone');
  if (!zoneCheck.success) {
    return { success: false, error: { message: zoneCheck.message } };
  }

  const result = await createChannelingRoom({
    number: payload.number,
    description: payload.description,
    locationId: locationCheck.id,
    zoneId: zoneCheck.id,
    status: payload.status
  });

  if (!result.success || !result.data?.id) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to create room in Channeling'
      }
    };
  }

  const link = await setRoomMigrateSourceId(hrmRoomId, result.data.id);
  if (!link.success) {
    return {
      success: false,
      error: {
        message:
          link.error?.message ??
          'Room was created in Channeling but could not be linked in HRM.'
      }
    };
  }

  return { success: true, data: { channelingId: result.data.id } };
}

/** Push update to Channeling when the HRM record is linked. */
export async function pushRoomUpdateToChanneling(
  hrmRoomId: string,
  migrateSourceId: string | null | undefined,
  payload: RoomPayload,
  channelingLocationId: string | null | undefined,
  channelingZoneId: string | null | undefined
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const channelingId = migrateSourceId?.trim();
  if (!channelingId) {
    return {
      success: false,
      error: {
        message:
          'This room is not linked to Channeling. Use Refresh to import it first, or create it again with sync enabled.'
      }
    };
  }

  const locationCheck = requireChannelingId(channelingLocationId, 'location');
  if (!locationCheck.success) {
    return { success: false, error: { message: locationCheck.message } };
  }

  const zoneCheck = requireChannelingId(channelingZoneId, 'zone');
  if (!zoneCheck.success) {
    return { success: false, error: { message: zoneCheck.message } };
  }

  const result = await updateChannelingRoom(channelingId, {
    number: payload.number,
    description: payload.description,
    locationId: locationCheck.id,
    zoneId: zoneCheck.id,
    status: payload.status
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to update room in Channeling'
      }
    };
  }

  await prisma.room.update({
    where: { id: hrmRoomId },
    data: { migrateSourceId: channelingId }
  });

  return { success: true };
}

/**
 * Push delete to Channeling when linked.
 * Call before deleting the HRM record so occupied/session 409s block local delete.
 */
export async function pushRoomDeleteToChanneling(
  migrateSourceId: string | null | undefined
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const channelingId = migrateSourceId?.trim();
  if (!channelingId) {
    return { success: true };
  }

  const result = await deleteChannelingRoom(channelingId);
  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to delete room in Channeling'
      }
    };
  }

  return { success: true };
}
