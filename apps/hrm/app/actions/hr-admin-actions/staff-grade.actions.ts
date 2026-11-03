'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createStaffGrade,
  deleteStaffGrade,
  getStaffGradeById,
  getStaffGradeList,
  updateStaffGrade
} from '@/services/hr-admin-services/staff-grade.service';
import { mapStaffGradeToUiRecord } from '@/lib/mappers/staff-grade-form.mapper';
import type {
  GetStaffGradeParams,
  StaffGradePayload,
  StaffGradeUiRecord
} from '@/types/staff-grade';

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
  return payload;
}

export async function getStaffGradeListAction(
  params: GetStaffGradeParams = {}
): Promise<{
  isError: boolean;
  data: StaffGradeUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('staff-grades', 'view');
    const result = await getStaffGradeList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load staff grades');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapStaffGradeToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffGradeListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getStaffGradeByIdAction(id: string) {
  try {
    await requirePermission('staff-grades', 'view');
    const result = await getStaffGradeById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Staff grade not found');
    }
    return {
      isError: false,
      data: mapStaffGradeToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffGradeByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch staff grade.' }
    };
  }
}

export async function createStaffGradeAction(data: StaffGradePayload) {
  await requirePermission('staff-grades', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as StaffGradePayload;
    const auditUser = await getAuditUser();
    const result = await createStaffGrade(payload, auditUser);

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
        action: 'staff-grades.created',
        entityType: 'StaffGrade',
        entityId: result.data.id,
        importance: 'high'
      });
    }

    revalidatePath('/staff-grades');
    return {
      isError: false,
      data: mapStaffGradeToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createStaffGradeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateStaffGradeAction(
  id: string,
  data: StaffGradePayload
) {
  await requirePermission('staff-grades', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as StaffGradePayload;
    const auditUser = await getAuditUser();
    const result = await updateStaffGrade(id, payload, auditUser);

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
        action: 'staff-grades.updated',
        entityType: 'StaffGrade',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/staff-grades');
    return {
      isError: false,
      data: mapStaffGradeToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('updateStaffGradeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteStaffGradeAction(id: string) {
  await requirePermission('staff-grades', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteStaffGrade(id);

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
        action: 'staff-grades.deleted',
        entityType: 'StaffGrade',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/staff-grades');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteStaffGradeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
