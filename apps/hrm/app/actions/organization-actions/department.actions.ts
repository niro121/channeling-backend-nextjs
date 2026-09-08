'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { mapDepartmentToUiRecord } from '@/lib/mappers/department-form.mapper';
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartmentList,
  updateDepartment
} from '@/services/organization-services/department.service';
import { syncAllDepartmentsFromChanneling } from '@/services/organization-services/department-sync.service';
import {
  pushDepartmentCreateToChanneling,
  pushDepartmentDeleteToChanneling,
  pushDepartmentUpdateToChanneling
} from '@/services/organization-services/department-channeling-push.service';
import type {
  DepartmentCrudOptions,
  DepartmentPayload,
  DepartmentUiRecord,
  GetDepartmentParams
} from '@/types/department';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
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

export async function getDepartmentListAction(
  params: GetDepartmentParams = {}
): Promise<{
  isError: boolean;
  data: DepartmentUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('organizations', 'view');
    const result = await getDepartmentList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load departments');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapDepartmentToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getDepartmentListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getDepartmentByIdAction(id: string) {
  try {
    await requirePermission('organizations', 'view');
    const result = await getDepartmentById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Department not found');
    }
    return {
      isError: false,
      data: mapDepartmentToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getDepartmentByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch department.' }
    };
  }
}

export async function createDepartmentAction(
  data: DepartmentPayload,
  options?: DepartmentCrudOptions
) {
  await requirePermission('organizations', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as DepartmentPayload;
    const auditUser = await getAuditUser();
    const result = await createDepartment(payload, auditUser);

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
    let channelingWarning: string | undefined;
    const shouldSyncToChanneling = options?.syncToChanneling ?? true;

    if (shouldSyncToChanneling && hrmId) {
      const channelingResult = await pushDepartmentCreateToChanneling(
        hrmId,
        payload
      );

      if (!channelingResult.success) {
        await deleteDepartment(hrmId);
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Department could not be created in Channeling. No record was saved in HRM.'
          },
          data: null
        };
      }

      const refreshed = await getDepartmentById(hrmId);
      if (refreshed.success && refreshed.data) {
        if (auditUser?.id) {
          logActivityNonBlocking({
            userId: auditUser.id,
            action: 'organizations.departments.created',
            entityType: 'Department',
            entityId: hrmId,
            importance: 'high'
          });
        }
        revalidatePath('/departments');
        return {
          isError: false,
          data: mapDepartmentToUiRecord(refreshed.data),
          errors: {}
        };
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.departments.created',
        entityType: 'Department',
        entityId: hrmId,
        importance: 'high'
      });
    }

    revalidatePath('/departments');
    return {
      isError: false,
      data: mapDepartmentToUiRecord(result.data),
      errors: {},
      channelingWarning
    };
  } catch (error: any) {
    console.error('createDepartmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateDepartmentAction(
  id: string,
  data: DepartmentPayload,
  options?: DepartmentCrudOptions
) {
  await requirePermission('organizations', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as DepartmentPayload;
    const existingResult = await getDepartmentById(id);
    const existing = existingResult.data;
    const auditUser = await getAuditUser();
    const result = await updateDepartment(id, payload, auditUser);

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
      const channelingResult = await pushDepartmentUpdateToChanneling(
        id,
        existing?.migrateSourceId,
        payload
      );
      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Department was updated in HRM, but Channeling sync failed.';
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.departments.updated',
        entityType: 'Department',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/departments');
    return {
      isError: false,
      data: mapDepartmentToUiRecord(result.data),
      errors: {},
      channelingWarning
    };
  } catch (error: any) {
    console.error('updateDepartmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteDepartmentAction(
  id: string,
  options?: DepartmentCrudOptions
) {
  await requirePermission('organizations', 'delete');
  try {
    const existingResult = await getDepartmentById(id);
    const migrateSourceId = existingResult.data?.migrateSourceId;
    const auditUser = await getAuditUser();
    const result = await deleteDepartment(id);

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

    let channelingWarning: string | undefined;
    if (options?.syncToChanneling) {
      const channelingResult =
        await pushDepartmentDeleteToChanneling(migrateSourceId);
      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Department was deleted in HRM, but Channeling sync failed.';
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.departments.deleted',
        entityType: 'Department',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/departments');
    return {
      isError: false,
      data: { deleted: true, channelingWarning },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteDepartmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function syncDepartmentsFromChannelingAction(keyword = '') {
  await requirePermission('organizations', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await syncAllDepartmentsFromChanneling(auditUser, keyword);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to sync departments from Channeling'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'organizations.departments.syncedFromChanneling',
        entityType: 'Department',
        importance: 'high',
        metadata: result.data
      });
    }

    revalidatePath('/departments');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('syncDepartmentsFromChannelingAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to sync departments from Channeling'
      }
    };
  }
}
