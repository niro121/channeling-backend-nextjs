'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createLeaveType,
  deleteLeaveType,
  deleteLeaveTypes,
  getLeaveTypeById,
  getLeaveTypeOptions,
  getLeaveTypes,
  getLeaveTypesForExport,
  updateLeaveType
} from '@/services/leave-services/leave-type.service';
import type { GetLeaveTypesParams, LeaveTypePayload } from '@/types/leave';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  return payload;
}

export async function getLeaveTypesAction(params: GetLeaveTypesParams) {
  try {
    await requirePermission('leave-types', 'view');
    const result = await getLeaveTypes({
      page: params.page ?? '1',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      keyword: params.keyword ?? '',
      status: params.status,
      isPaid: params.isPaid,
      requiresApproval: params.requiresApproval,
      allowHalfDay: params.allowHalfDay
    });

    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting data. Please try again later'
      );
    }

    return {
      isError: false,
      data: {
        data: result.data?.records ?? [],
        totalRecords: result.data?.totalRecords ?? 0
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getLeaveTypesAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getLeaveTypeByIdAction(id: string) {
  try {
    await requirePermission('leave-types', 'view');
    const result = await getLeaveTypeById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Leave type not found');
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getLeaveTypeByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch leave type.' }
    };
  }
}

export async function createLeaveTypeAction(data: LeaveTypePayload) {
  await requirePermission('leave-types', 'add');
  try {
    const payload = stripAuditFields({ ...data });
    const auditUser = await getAuditUser();
    const result = await createLeaveType(payload, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.leaveType.created',
        entityType: 'LeaveType',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath('/leave-types');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('createLeaveTypeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateLeaveTypeAction(
  id: string,
  data: Partial<LeaveTypePayload>
) {
  await requirePermission('leave-types', 'edit');
  try {
    const payload = stripAuditFields({ ...data });
    const auditUser = await getAuditUser();
    const result = await updateLeaveType(id, payload, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.leaveType.updated',
        entityType: 'LeaveType',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/leave-types');
    revalidatePath(`/leave-types/${id}/edit`);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateLeaveTypeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteLeaveTypeAction(id: string) {
  await requirePermission('leave-types', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteLeaveType(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.leaveType.deleted',
        entityType: 'LeaveType',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/leave-types');
    return {
      isError: false,
      data: {},
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteLeaveTypeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function bulkDeleteLeaveTypesAction(ids: string[]) {
  await requirePermission('leave-types', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteLeaveTypes(ids);
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error deleting records. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.leaveType.bulkDeleted',
        entityType: 'LeaveType',
        importance: 'high',
        metadata: { count: ids.length }
      });
    }

    revalidatePath('/leave-types');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteLeaveTypesAction error:', error);
    throw new Error(
      error.message ?? 'Error deleting records. Please try again later'
    );
  }
}

export async function getLeaveTypesExport(params: {
  status?: string;
  isPaid?: string;
  requiresApproval?: string;
  allowHalfDay?: string;
  keyword?: string;
}) {
  try {
    await requirePermission('leave-types', 'view');
    const result = await getLeaveTypesForExport(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export leave types',
        data: []
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      message: result.message
    };
  } catch (error: any) {
    console.error('getLeaveTypesExport error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export leave types',
      data: []
    };
  }
}

export async function getLeaveTypeOptionsAction() {
  try {
    await requirePermission('leave-types', 'view');
    const result = await getLeaveTypeOptions();
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load leave type options'
        }
      };
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getLeaveTypeOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load leave type options'
      }
    };
  }
}
