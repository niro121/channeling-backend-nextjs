'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { checkPermission, requirePermission } from '@/lib/server-permissions';
import {
  approveLeaveApplication,
  cancelLeaveApplication,
  createLeaveApplication,
  deleteLeaveApplication,
  deleteLeaveApplications,
  getLeaveApplicationBalanceSnapshot,
  getLeaveApplicationById,
  getLeaveApplications,
  getLeaveApplicationsForExport,
  getLeaveApproverOptions,
  rejectLeaveApplication,
  updateLeaveApplication
} from '@/services/leave-services/leave-application.service';
import type {
  GetLeaveApplicationsParams,
  LeaveApplicationPayload
} from '@/types/leave';

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
  delete (payload as any).days;
  return payload;
}

export async function getLeaveApplicationsAction(
  params: GetLeaveApplicationsParams
) {
  try {
    await requirePermission('leave-application', 'view');
    const result = await getLeaveApplications({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      staffId: params.staffId,
      leaveTypeId: params.leaveTypeId,
      approverId: params.approverId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      dateSearchBy: params.dateSearchBy,
      outWithCancel: params.outWithCancel
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
    console.error('getLeaveApplicationsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getLeaveApplicationByIdAction(id: string) {
  try {
    await requirePermission('leave-application', 'view');
    const result = await getLeaveApplicationById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Leave application not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getLeaveApplicationByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch leave application.' }
    };
  }
}

export async function createLeaveApplicationAction(
  data: LeaveApplicationPayload
) {
  await requirePermission('leave-application', 'add');
  try {
    const payload = stripAuditFields({ ...data } as Record<string, unknown>);
    const auditUser = await getAuditUser();
    const result = await createLeaveApplication(
      payload as unknown as LeaveApplicationPayload,
      auditUser
    );

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to create leave application',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.application.created',
        entityType: 'LeaveApplication',
        entityId: result.data?.id,
        importance: 'medium'
      });
    }

    revalidatePath('/leave-application');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id },
      errors: {}
    };
  } catch (error: any) {
    console.error('createLeaveApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateLeaveApplicationAction(
  id: string,
  data: LeaveApplicationPayload
) {
  await requirePermission('leave-application', 'edit');
  try {
    const payload = stripAuditFields({ ...data } as Record<string, unknown>);
    const auditUser = await getAuditUser();
    const result = await updateLeaveApplication(
      id,
      payload as unknown as LeaveApplicationPayload,
      auditUser
    );

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to update leave application',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.application.updated',
        entityType: 'LeaveApplication',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/leave-application');
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateLeaveApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteLeaveApplicationAction(id: string) {
  await requirePermission('leave-application', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteLeaveApplication(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.application.deleted',
        entityType: 'LeaveApplication',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/leave-application');
    return { isError: false, data: {}, errors: {} };
  } catch (error: any) {
    console.error('deleteLeaveApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function bulkDeleteLeaveApplicationsAction(ids: string[]) {
  await requirePermission('leave-application', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteLeaveApplications(ids);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.application.bulk_deleted',
        entityType: 'LeaveApplication',
        metadata: { ids },
        importance: 'high'
      });
    }

    revalidatePath('/leave-application');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteLeaveApplicationsAction error:', error);
    return false;
  }
}

export async function getLeaveApplicationsExport(
  params: Omit<GetLeaveApplicationsParams, 'page' | 'limit'>
) {
  try {
    await requirePermission('leave-application', 'view');
    const result = await getLeaveApplicationsForExport(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export leave applications',
        data: []
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      message: result.message
    };
  } catch (error: any) {
    console.error('getLeaveApplicationsExport error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export leave applications',
      data: []
    };
  }
}

export async function getLeaveApplicationBalanceSnapshotAction(params: {
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | string;
  toDate: Date | string;
}) {
  try {
    await requirePermission('leave-application', 'view');
    const result = await getLeaveApplicationBalanceSnapshot(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to recalculate balance');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getLeaveApplicationBalanceSnapshotAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to recalculate balance' }
    };
  }
}

/** Staff + published leave types + approvers for application form/filters. */
export async function getLeaveApplicationFormOptionsAction() {
  try {
    await requirePermission('leave-application', 'view');
    const [{ getStaffOptions }, { getLeaveTypeOptions }] = await Promise.all([
      import('@/services/staff-services/staff.service'),
      import('@/services/leave-services/leave-type.service')
    ]);

    const [staffResult, leaveTypeResult, approverResult] = await Promise.all([
      getStaffOptions(),
      getLeaveTypeOptions(),
      getLeaveApproverOptions()
    ]);

    const { default: prisma } = await import('@/lib/prisma');
    const leaveTypeIds = (leaveTypeResult.data ?? []).map((t) => t.id);
    const halfDayRows =
      leaveTypeIds.length > 0
        ? await prisma.leaveType.findMany({
            where: { id: { in: leaveTypeIds } },
            select: { id: true, allowHalfDay: true }
          })
        : [];
    const halfDayMap = new Map(
      halfDayRows.map((row) => [row.id, row.allowHalfDay])
    );

    return {
      isError: false,
      data: {
        staff: staffResult.data ?? [],
        leaveTypes: (leaveTypeResult.data ?? []).map((type) => ({
          ...type,
          allowHalfDay: halfDayMap.get(type.id) ?? true
        })),
        approvers: approverResult.data ?? []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getLeaveApplicationFormOptionsAction error:', error);
    return {
      isError: true,
      data: { staff: [], leaveTypes: [], approvers: [] },
      errors: {
        message: error.message ?? 'Failed to load form options'
      }
    };
  }
}

async function runStatusTransition(
  id: string,
  action: 'approve' | 'reject' | 'cancel'
) {
  const canManage = await checkPermission('leave-management', 'edit');
  const canEditApplication = await checkPermission('leave-application', 'edit');
  if (!canManage && !canEditApplication) {
    throw new Error(
      `Access denied: You don't have permission to ${action} leave applications`
    );
  }

  const auditUser = await getAuditUser();
  const runner =
    action === 'approve'
      ? approveLeaveApplication
      : action === 'reject'
        ? rejectLeaveApplication
        : cancelLeaveApplication;

  const result = await runner(id, auditUser);
  if (!result.success) {
    return {
      isError: true as const,
      data: null,
      errors: {
        message:
          result.error?.message ?? `Failed to ${action} leave application`
      }
    };
  }

  if (auditUser?.id) {
    logActivityNonBlocking({
      userId: auditUser.id,
      action: `leave.application.${
        action === 'approve'
          ? 'approved'
          : action === 'reject'
            ? 'rejected'
            : 'cancelled'
      }`,
      entityType: 'LeaveApplication',
      entityId: id,
      importance: 'high'
    });
  }

  revalidatePath('/leave-application');
  revalidatePath('/leave-management');
  revalidatePath('/leave-entitlement');

  return {
    isError: false as const,
    data: result.data,
    errors: {}
  };
}

export async function approveLeaveApplicationAction(id: string) {
  try {
    return await runStatusTransition(id, 'approve');
  } catch (error: any) {
    console.error('approveLeaveApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to approve leave application'
      }
    };
  }
}

export async function rejectLeaveApplicationAction(id: string) {
  try {
    return await runStatusTransition(id, 'reject');
  } catch (error: any) {
    console.error('rejectLeaveApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to reject leave application'
      }
    };
  }
}

export async function cancelLeaveApplicationAction(id: string) {
  try {
    return await runStatusTransition(id, 'cancel');
  } catch (error: any) {
    console.error('cancelLeaveApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to cancel leave application'
      }
    };
  }
}
