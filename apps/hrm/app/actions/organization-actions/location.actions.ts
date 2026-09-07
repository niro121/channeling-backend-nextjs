'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { mapLocationToUiRecord } from '@/lib/mappers/location-form.mapper';
import {
  createLocation,
  deleteLocation,
  getLocationById,
  getLocationList,
  updateLocation
} from '@/services/organization-services/location.service';
import { syncAllLocationsFromChanneling } from '@/services/organization-services/location-sync.service';
import {
  pushLocationCreateToChanneling,
  pushLocationDeleteToChanneling,
  pushLocationUpdateToChanneling
} from '@/services/organization-services/location-channeling-push.service';
import type {
  GetLocationParams,
  LocationCrudOptions,
  LocationPayload,
  LocationUiRecord
} from '@/types/location';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).migrateSourceId;
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

export async function getLocationListAction(
  params: GetLocationParams = {}
): Promise<{
  isError: boolean;
  data: LocationUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('organizations', 'view');
    const result = await getLocationList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load locations');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapLocationToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getLocationListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getLocationByIdAction(id: string) {
  try {
    await requirePermission('organizations', 'view');
    const result = await getLocationById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Location not found');
    }
    return {
      isError: false,
      data: mapLocationToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getLocationByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch location.' }
    };
  }
}

export async function createLocationAction(
  data: LocationPayload,
  options?: LocationCrudOptions
) {
  await requirePermission('organizations', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as LocationPayload;
    const auditUser = await getAuditUser();
    const result = await createLocation(payload, auditUser);

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
      const channelingResult = await pushLocationCreateToChanneling(hrmId, {
        ...payload,
        code: result.data.code
      });

      if (!channelingResult.success) {
        await deleteLocation(hrmId);
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Location could not be created in Channeling. No record was saved in HRM.'
          },
          data: null
        };
      }

      const refreshed = await getLocationById(hrmId);
      if (refreshed.success && refreshed.data) {
        if (auditUser?.id) {
          logActivityNonBlocking({
            userId: auditUser.id,
            action: 'organizations.locations.created',
            entityType: 'Location',
            entityId: hrmId,
            importance: 'high'
          });
        }
        revalidatePath('/locations');
        return {
          isError: false,
          data: mapLocationToUiRecord(refreshed.data),
          errors: {}
        };
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.locations.created',
        entityType: 'Location',
        entityId: hrmId,
        importance: 'high'
      });
    }

    revalidatePath('/locations');
    return {
      isError: false,
      data: mapLocationToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createLocationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateLocationAction(
  id: string,
  data: LocationPayload,
  options?: LocationCrudOptions
) {
  await requirePermission('organizations', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as LocationPayload;
    const existingResult = await getLocationById(id);
    const existing = existingResult.data;
    const auditUser = await getAuditUser();
    const result = await updateLocation(id, payload, auditUser);

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
      const channelingResult = await pushLocationUpdateToChanneling(
        id,
        existing?.migrateSourceId,
        {
          ...payload,
          code: result.data.code
        }
      );
      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Location was updated in HRM, but Channeling sync failed.';
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.locations.updated',
        entityType: 'Location',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/locations');
    return {
      isError: false,
      data: mapLocationToUiRecord(result.data),
      errors: {},
      channelingWarning
    };
  } catch (error: any) {
    console.error('updateLocationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteLocationAction(
  id: string,
  options?: LocationCrudOptions
) {
  await requirePermission('organizations', 'delete');
  try {
    const existingResult = await getLocationById(id);
    const migrateSourceId = existingResult.data?.migrateSourceId;
    const auditUser = await getAuditUser();

    if (options?.syncToChanneling) {
      const channelingResult =
        await pushLocationDeleteToChanneling(migrateSourceId);
      if (!channelingResult.success) {
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Cannot delete this location because it is still linked in Channeling (e.g. zones or rooms).'
          },
          data: null
        };
      }
    }

    const result = await deleteLocation(id);

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
        action: 'organizations.locations.deleted',
        entityType: 'Location',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/locations');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteLocationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function syncLocationsFromChannelingAction(keyword = '') {
  await requirePermission('organizations', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await syncAllLocationsFromChanneling(auditUser, keyword);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to sync locations from Channeling'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.locations.syncedFromChanneling',
        entityType: 'Location',
        importance: 'high',
        metadata: result.data
      });
    }

    revalidatePath('/locations');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('syncLocationsFromChannelingAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to sync locations from Channeling'
      }
    };
  }
}
