'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { mapZoneToUiRecord } from '@/lib/mappers/zone-form.mapper';
import {
  createZone,
  deleteZone,
  getLinkedLocationOptions,
  getZoneById,
  getZoneList,
  updateZone
} from '@/services/organization-services/zone.service';
import { syncAllZonesFromChanneling } from '@/services/organization-services/zone-sync.service';
import {
  pushZoneCreateToChanneling,
  pushZoneDeleteToChanneling,
  pushZoneUpdateToChanneling
} from '@/services/organization-services/zone-channeling-push.service';
import type {
  GetZoneParams,
  ZoneCrudOptions,
  ZoneLocationSummary,
  ZonePayload,
  ZoneUiRecord
} from '@/types/zone';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).migrateSourceId;
  delete (payload as any).locationName;
  delete (payload as any).locationCode;
  delete (payload as any).locationMigrateSourceId;
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

export async function getZoneListAction(params: GetZoneParams = {}): Promise<{
  isError: boolean;
  data: ZoneUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('organizations', 'view');
    const result = await getZoneList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load zones');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapZoneToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getZoneListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getLinkedLocationOptionsAction(): Promise<{
  isError: boolean;
  data: ZoneLocationSummary[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('organizations', 'view');
    const result = await getLinkedLocationOptions();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load locations');
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getLinkedLocationOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load locations'
      }
    };
  }
}

export async function getZoneByIdAction(id: string) {
  try {
    await requirePermission('organizations', 'view');
    const result = await getZoneById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Zone not found');
    }
    return {
      isError: false,
      data: mapZoneToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getZoneByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch zone.' }
    };
  }
}

export async function createZoneAction(
  data: ZonePayload,
  options?: ZoneCrudOptions
) {
  await requirePermission('organizations', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as ZonePayload;
    const auditUser = await getAuditUser();
    const result = await createZone(payload, auditUser);

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
      const channelingResult = await pushZoneCreateToChanneling(
        hrmId,
        payload,
        result.data.locationMigrateSourceId
      );

      if (!channelingResult.success) {
        await deleteZone(hrmId);
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Zone could not be created in Channeling. No record was saved in HRM.'
          },
          data: null
        };
      }

      const refreshed = await getZoneById(hrmId);
      if (refreshed.success && refreshed.data) {
        if (auditUser?.id) {
          logActivityNonBlocking({
            userId: auditUser.id,
            action: 'organizations.zones.created',
            entityType: 'Zone',
            entityId: hrmId,
            importance: 'high'
          });
        }
        revalidatePath('/zones');
        return {
          isError: false,
          data: mapZoneToUiRecord(refreshed.data),
          errors: {}
        };
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.zones.created',
        entityType: 'Zone',
        entityId: hrmId,
        importance: 'high'
      });
    }

    revalidatePath('/zones');
    return {
      isError: false,
      data: mapZoneToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createZoneAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateZoneAction(
  id: string,
  data: ZonePayload,
  options?: ZoneCrudOptions
) {
  await requirePermission('organizations', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as ZonePayload;
    const existingResult = await getZoneById(id);
    const existing = existingResult.data;
    const auditUser = await getAuditUser();
    const result = await updateZone(id, payload, auditUser);

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
      const channelingResult = await pushZoneUpdateToChanneling(
        id,
        existing?.migrateSourceId,
        payload,
        result.data.locationMigrateSourceId
      );
      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Zone was updated in HRM, but Channeling sync failed.';
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.zones.updated',
        entityType: 'Zone',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/zones');
    return {
      isError: false,
      data: mapZoneToUiRecord(result.data),
      errors: {},
      channelingWarning
    };
  } catch (error: any) {
    console.error('updateZoneAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteZoneAction(
  id: string,
  options?: ZoneCrudOptions
) {
  await requirePermission('organizations', 'delete');
  try {
    const existingResult = await getZoneById(id);
    const migrateSourceId = existingResult.data?.migrateSourceId;
    const auditUser = await getAuditUser();

    if (options?.syncToChanneling) {
      const channelingResult = await pushZoneDeleteToChanneling(migrateSourceId);
      if (!channelingResult.success) {
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Cannot delete this zone because it is still linked in Channeling (e.g. rooms).'
          },
          data: null
        };
      }
    }

    const result = await deleteZone(id);

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
        action: 'organizations.zones.deleted',
        entityType: 'Zone',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/zones');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteZoneAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function syncZonesFromChannelingAction(keyword = '') {
  await requirePermission('organizations', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await syncAllZonesFromChanneling(auditUser, keyword);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to sync zones from Channeling'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.zones.syncedFromChanneling',
        entityType: 'Zone',
        importance: 'high',
        metadata: result.data
      });
    }

    revalidatePath('/zones');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('syncZonesFromChannelingAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to sync zones from Channeling'
      }
    };
  }
}
