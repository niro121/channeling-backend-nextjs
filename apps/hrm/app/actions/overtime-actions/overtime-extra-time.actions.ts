'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getOvertimeFormOptions } from '@/services/overtime-services/overtime-shared';
import {
  createExtraTimeRecord,
  deleteExtraTimeRecord,
  getExtraTimeRecords,
  getExtraTimeRecordsForExport,
  updateExtraTimeRecord
} from '@/services/overtime-services/overtime-extra-time.service';
import type { ExtraTimePayload, GetExtraTimeParams } from '@/types/overtime';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).formNumber;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).status;
  delete (payload as any).approvedAt;
  delete (payload as any).approverName;
  delete (payload as any).hours;
  return payload;
}

export async function getExtraTimeRecordsAction(params: GetExtraTimeParams) {
  try {
    await requirePermission('overtime-requests', 'view');
    const result = await getExtraTimeRecords({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      staffId: params.staffId,
      approverId: params.approverId,
      fromDate: params.fromDate,
      toDate: params.toDate
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
    console.error('getExtraTimeRecordsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getExtraTimeFormOptionsAction() {
  try {
    await requirePermission('overtime-requests', 'view');
    const result = await getOvertimeFormOptions();
    return {
      isError: false,
      data: {
        staff: result.data?.staff ?? [],
        approvers: result.data?.approvers ?? []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getExtraTimeFormOptionsAction error:', error);
    return {
      isError: true,
      data: { staff: [], approvers: [] },
      errors: {
        message: error.message ?? 'Failed to load form options'
      }
    };
  }
}

export async function createExtraTimeAction(data: ExtraTimePayload) {
  await requirePermission('overtime-requests', 'add');
  try {
    const payload = stripAuditFields({ ...data } as Record<string, unknown>);
    const auditUser = await getAuditUser();
    const result = await createExtraTimeRecord(
      payload as unknown as ExtraTimePayload,
      auditUser
    );

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to create extra time form',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'overtime.extra-time.created',
        entityType: 'OvertimeExtraTime',
        entityId: result.data?.id,
        importance: 'medium'
      });
    }

    revalidatePath('/overtime-extra-time');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id },
      errors: {}
    };
  } catch (error: any) {
    console.error('createExtraTimeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateExtraTimeAction(
  id: string,
  data: ExtraTimePayload
) {
  await requirePermission('overtime-requests', 'edit');
  try {
    const payload = stripAuditFields({ ...data } as Record<string, unknown>);
    const auditUser = await getAuditUser();
    const result = await updateExtraTimeRecord(
      id,
      payload as unknown as ExtraTimePayload,
      auditUser
    );

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to update extra time form',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'overtime.extra-time.updated',
        entityType: 'OvertimeExtraTime',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/overtime-extra-time');
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateExtraTimeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteExtraTimeAction(
  id: string,
  deleteComment?: string
) {
  await requirePermission('overtime-requests', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteExtraTimeRecord(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'overtime.extra-time.deleted',
        entityType: 'OvertimeExtraTime',
        entityId: id,
        metadata: deleteComment?.trim()
          ? { deleteComment: deleteComment.trim() }
          : undefined,
        importance: 'high'
      });
    }

    revalidatePath('/overtime-extra-time');
    return { isError: false, data: {}, errors: {} };
  } catch (error: any) {
    console.error('deleteExtraTimeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function getExtraTimeExport(
  params: Omit<GetExtraTimeParams, 'page' | 'limit'>
) {
  try {
    await requirePermission('overtime-requests', 'view');
    const result = await getExtraTimeRecordsForExport(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export extra time forms',
        data: []
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      message: result.message
    };
  } catch (error: any) {
    console.error('getExtraTimeExport error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export extra time forms',
      data: []
    };
  }
}
