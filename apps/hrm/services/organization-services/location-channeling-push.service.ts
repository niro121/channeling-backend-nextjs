'use server';

import prisma from '@/lib/prisma';
import {
  createChannelingLocation,
  deleteChannelingLocation,
  updateChannelingLocation
} from '@/services/organization-services/channeling-location-write.service';
import { setLocationMigrateSourceId } from '@/services/organization-services/location.service';
import type { LocationPayload } from '@/types/location';

type PushPayload = LocationPayload & { code: string };

/** Push create to Channeling and store migrateSourceId on the HRM record. */
export async function pushLocationCreateToChanneling(
  hrmLocationId: string,
  payload: PushPayload
): Promise<{
  success: boolean;
  data?: { channelingId: string };
  error?: { message?: string };
}> {
  const result = await createChannelingLocation(payload);
  if (!result.success || !result.data?.id) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to create location in Channeling'
      }
    };
  }

  const link = await setLocationMigrateSourceId(hrmLocationId, result.data.id);
  if (!link.success) {
    return {
      success: false,
      error: {
        message:
          link.error?.message ??
          'Location was created in Channeling but could not be linked in HRM.'
      }
    };
  }

  return { success: true, data: { channelingId: result.data.id } };
}

/** Push update to Channeling when the HRM record is linked. */
export async function pushLocationUpdateToChanneling(
  hrmLocationId: string,
  migrateSourceId: string | null | undefined,
  payload: PushPayload
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
          'This location is not linked to Channeling. Use Refresh to import it first, or create it again with sync enabled.'
      }
    };
  }

  const result = await updateChannelingLocation(channelingId, payload);
  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to update location in Channeling'
      }
    };
  }

  await prisma.location.update({
    where: { id: hrmLocationId },
    data: { migrateSourceId: channelingId }
  });

  return { success: true };
}

/**
 * Push delete to Channeling when linked.
 * Call this before deleting the HRM record so linked-zone/room 409s block local delete.
 */
export async function pushLocationDeleteToChanneling(
  migrateSourceId: string | null | undefined
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const channelingId = migrateSourceId?.trim();
  if (!channelingId) {
    return { success: true };
  }

  const result = await deleteChannelingLocation(channelingId);
  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to delete location in Channeling'
      }
    };
  }

  return { success: true };
}
