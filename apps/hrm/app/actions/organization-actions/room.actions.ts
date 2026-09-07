'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { mapRoomToUiRecord } from '@/lib/mappers/room-form.mapper';
import {
  createRoom,
  deleteRoom,
  getLinkedLocationOptionsForRooms,
  getLinkedZoneOptionsForRooms,
  getRoomById,
  getRoomList,
  updateRoom
} from '@/services/organization-services/room.service';
import { syncAllRoomsFromChanneling } from '@/services/organization-services/room-sync.service';
import {
  pushRoomCreateToChanneling,
  pushRoomDeleteToChanneling,
  pushRoomUpdateToChanneling
} from '@/services/organization-services/room-channeling-push.service';
import type {
  GetRoomParams,
  RoomCrudOptions,
  RoomLocationSummary,
  RoomPayload,
  RoomUiRecord,
  RoomZoneSummary
} from '@/types/room';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).migrateSourceId;
  delete (payload as any).locationName;
  delete (payload as any).locationCode;
  delete (payload as any).locationMigrateSourceId;
  delete (payload as any).zoneName;
  delete (payload as any).zoneCode;
  delete (payload as any).zoneMigrateSourceId;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).createdByUser;
  delete (payload as any).updatedByUser;
  return payload;
}

export async function getRoomListAction(params: GetRoomParams = {}): Promise<{
  isError: boolean;
  data: RoomUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('organizations', 'view');
    const result = await getRoomList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load rooms');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapRoomToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getRoomListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getLinkedLocationOptionsForRoomsAction(): Promise<{
  isError: boolean;
  data: RoomLocationSummary[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('organizations', 'view');
    const result = await getLinkedLocationOptionsForRooms();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load locations');
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getLinkedLocationOptionsForRoomsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to load locations' }
    };
  }
}

export async function getLinkedZoneOptionsForRoomsAction(
  locationId?: string
): Promise<{
  isError: boolean;
  data: RoomZoneSummary[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('organizations', 'view');
    const result = await getLinkedZoneOptionsForRooms(locationId);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load zones');
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getLinkedZoneOptionsForRoomsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to load zones' }
    };
  }
}

export async function getRoomByIdAction(id: string) {
  try {
    await requirePermission('organizations', 'view');
    const result = await getRoomById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Room not found');
    }
    return {
      isError: false,
      data: mapRoomToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getRoomByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch room.' }
    };
  }
}

export async function createRoomAction(
  data: RoomPayload,
  options?: RoomCrudOptions
) {
  await requirePermission('organizations', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as RoomPayload;
    const auditUser = await getAuditUser();
    const result = await createRoom(payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: null
      };
    }

    const hrmId = result.data.id;
    const shouldSyncToChanneling = options?.syncToChanneling ?? true;

    if (shouldSyncToChanneling && hrmId) {
      const channelingResult = await pushRoomCreateToChanneling(
        hrmId,
        payload,
        result.data.locationMigrateSourceId,
        result.data.zoneMigrateSourceId
      );

      if (!channelingResult.success) {
        await deleteRoom(hrmId);
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Room could not be created in Channeling. No record was saved in HRM.'
          },
          data: null
        };
      }

      const refreshed = await getRoomById(hrmId);
      if (refreshed.success && refreshed.data) {
        if (auditUser?.id) {
          logActivityNonBlocking({
            userId: auditUser.id,
            action: 'organizations.rooms.created',
            entityType: 'Room',
            entityId: hrmId,
            importance: 'high'
          });
        }
        revalidatePath('/rooms');
        return {
          isError: false,
          data: mapRoomToUiRecord(refreshed.data),
          errors: {}
        };
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.rooms.created',
        entityType: 'Room',
        entityId: hrmId,
        importance: 'high'
      });
    }

    revalidatePath('/rooms');
    return {
      isError: false,
      data: mapRoomToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createRoomAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateRoomAction(
  id: string,
  data: RoomPayload,
  options?: RoomCrudOptions
) {
  await requirePermission('organizations', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as RoomPayload;
    const existingResult = await getRoomById(id);
    const existing = existingResult.data;
    const auditUser = await getAuditUser();
    const result = await updateRoom(id, payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: null
      };
    }

    let channelingWarning: string | undefined;
    if (options?.syncToChanneling) {
      const channelingResult = await pushRoomUpdateToChanneling(
        id,
        existing?.migrateSourceId,
        payload,
        result.data.locationMigrateSourceId,
        result.data.zoneMigrateSourceId
      );
      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Room was updated in HRM, but Channeling sync failed.';
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.rooms.updated',
        entityType: 'Room',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/rooms');
    return {
      isError: false,
      data: mapRoomToUiRecord(result.data),
      errors: {},
      channelingWarning
    };
  } catch (error: any) {
    console.error('updateRoomAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteRoomAction(
  id: string,
  options?: RoomCrudOptions
) {
  await requirePermission('organizations', 'delete');
  try {
    const existingResult = await getRoomById(id);
    const migrateSourceId = existingResult.data?.migrateSourceId;
    const auditUser = await getAuditUser();

    if (options?.syncToChanneling) {
      const channelingResult = await pushRoomDeleteToChanneling(migrateSourceId);
      if (!channelingResult.success) {
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Cannot delete this room because it is occupied or linked to sessions in Channeling.'
          },
          data: null
        };
      }
    }

    const result = await deleteRoom(id);

    if (!result.success) {
      return {
        isError: true,
        errors: {
          message:
            result.error?.message ??
            'Something went wrong. Please try again later'
        },
        data: null
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.rooms.deleted',
        entityType: 'Room',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/rooms');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteRoomAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function syncRoomsFromChannelingAction(keyword = '') {
  await requirePermission('organizations', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await syncAllRoomsFromChanneling(auditUser, keyword);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to sync rooms from Channeling'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.rooms.syncedFromChanneling',
        entityType: 'Room',
        importance: 'high',
        metadata: result.data
      });
    }

    revalidatePath('/rooms');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('syncRoomsFromChannelingAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to sync rooms from Channeling'
      }
    };
  }
}
