'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createStaffSpeciality,
  deleteStaffSpeciality,
  getStaffSpecialityById,
  getStaffSpecialityList,
  getStaffSpecialityOptions,
  updateStaffSpeciality
} from '@/services/hr-admin-services/staff-speciality.service';
import { mapStaffSpecialityToUiRecord } from '@/lib/mappers/staff-speciality-form.mapper';
import type {
  GetStaffSpecialityParams,
  StaffSpecialityOption,
  StaffSpecialityPayload,
  StaffSpecialityUiRecord
} from '@/types/staff-speciality';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).createdByUser;
  delete (payload as any).updatedByUser;
  delete (payload as any).staffCount;
  return payload;
}

export async function getStaffSpecialityListAction(
  params: GetStaffSpecialityParams = {}
): Promise<{
  isError: boolean;
  data: StaffSpecialityUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('staff-specialities', 'view');
    const result = await getStaffSpecialityList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load staff specialities');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapStaffSpecialityToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffSpecialityListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

/** Options for Staff General multi-select (staff permission, not master CRUD). */
export async function getStaffSpecialityOptionsAction(
  params: GetStaffSpecialityParams = {}
): Promise<{
  isError: boolean;
  data: StaffSpecialityOption[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('staff', 'view');
    const result = await getStaffSpecialityOptions(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load speciality options');
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffSpecialityOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting speciality options.'
      }
    };
  }
}

export async function getStaffSpecialityByIdAction(id: string) {
  try {
    await requirePermission('staff-specialities', 'view');
    const result = await getStaffSpecialityById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Staff speciality not found');
    }
    return {
      isError: false,
      data: mapStaffSpecialityToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffSpecialityByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch staff speciality.' }
    };
  }
}

export async function createStaffSpecialityAction(data: StaffSpecialityPayload) {
  await requirePermission('staff-specialities', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as StaffSpecialityPayload;
    const auditUser = await getAuditUser();
    const result = await createStaffSpeciality(payload, auditUser);

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

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff-specialities.created',
        entityType: 'StaffSpeciality',
        entityId: result.data.id,
        importance: 'high'
      });
    }

    revalidatePath('/staff-specialities');
    revalidatePath('/staff');
    return {
      isError: false,
      data: mapStaffSpecialityToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createStaffSpecialityAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateStaffSpecialityAction(
  id: string,
  data: StaffSpecialityPayload
) {
  await requirePermission('staff-specialities', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as StaffSpecialityPayload;
    const auditUser = await getAuditUser();
    const result = await updateStaffSpeciality(id, payload, auditUser);

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

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff-specialities.updated',
        entityType: 'StaffSpeciality',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/staff-specialities');
    revalidatePath('/staff');
    return {
      isError: false,
      data: mapStaffSpecialityToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('updateStaffSpecialityAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteStaffSpecialityAction(id: string) {
  await requirePermission('staff-specialities', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteStaffSpeciality(id);

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
        action: 'staff-specialities.deleted',
        entityType: 'StaffSpeciality',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/staff-specialities');
    revalidatePath('/staff');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteStaffSpecialityAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
