'use server';

import prisma from '@/lib/prisma';
import {
  createChannelingZone,
  deleteChannelingZone,
  updateChannelingZone
} from '@/services/organization-services/channeling-zone-write.service';
import { setZoneMigrateSourceId } from '@/services/organization-services/zone.service';
import type { ZonePayload } from '@/types/zone';

type PushContext = ZonePayload & {
  /** Channeling Location.id from HRM Location.migrateSourceId */
  channelingLocationId: string;
};

function requireChannelingLocationId(
  channelingLocationId: string | null | undefined
): { success: true; id: string } | { success: false; message: string } {
  const id = channelingLocationId?.trim();
  if (!id) {
    return {
      success: false,
      message:
        'The selected location is not linked to Channeling. Refresh Locations first, then try again.'
    };
  }
  return { success: true, id };
}

/** Push create to Channeling and store migrateSourceId on the HRM record. */
export async function pushZoneCreateToChanneling(
  hrmZoneId: string,
  payload: ZonePayload,
  channelingLocationId: string | null | undefined
): Promise<{
  success: boolean;
  data?: { channelingId: string };
  error?: { message?: string };
}> {
  const locationCheck = requireChannelingLocationId(channelingLocationId);
  if (!locationCheck.success) {
    return { success: false, error: { message: locationCheck.message } };
  }

  const body: PushContext = {
    ...payload,
    channelingLocationId: locationCheck.id
  };

  const result = await createChannelingZone({
    name: body.name,
    description: body.description,
    locationId: body.channelingLocationId,
    status: body.status
  });

  if (!result.success || !result.data?.id) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to create zone in Channeling'
      }
    };
  }

  const link = await setZoneMigrateSourceId(hrmZoneId, result.data.id);
  if (!link.success) {
    return {
      success: false,
      error: {
        message:
          link.error?.message ??
          'Zone was created in Channeling but could not be linked in HRM.'
      }
    };
  }

  return { success: true, data: { channelingId: result.data.id } };
}

/** Push update to Channeling when the HRM record is linked. */
export async function pushZoneUpdateToChanneling(
  hrmZoneId: string,
  migrateSourceId: string | null | undefined,
  payload: ZonePayload,
  channelingLocationId: string | null | undefined
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
          'This zone is not linked to Channeling. Use Refresh to import it first, or create it again with sync enabled.'
      }
    };
  }

  const locationCheck = requireChannelingLocationId(channelingLocationId);
  if (!locationCheck.success) {
    return { success: false, error: { message: locationCheck.message } };
  }

  const result = await updateChannelingZone(channelingId, {
    name: payload.name,
    description: payload.description,
    locationId: locationCheck.id,
    status: payload.status
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to update zone in Channeling'
      }
    };
  }

  await prisma.zone.update({
    where: { id: hrmZoneId },
    data: { migrateSourceId: channelingId }
  });

  return { success: true };
}

/**
 * Push delete to Channeling when linked.
 * Call this before deleting the HRM record so linked-room 409s block local delete.
 */
export async function pushZoneDeleteToChanneling(
  migrateSourceId: string | null | undefined
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const channelingId = migrateSourceId?.trim();
  if (!channelingId) {
    return { success: true };
  }

  const result = await deleteChannelingZone(channelingId);
  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to delete zone in Channeling'
      }
    };
  }

  return { success: true };
}
