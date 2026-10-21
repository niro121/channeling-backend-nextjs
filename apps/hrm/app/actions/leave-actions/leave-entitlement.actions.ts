'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createLeaveEntitlement,
  deleteLeaveEntitlement,
  getLeaveEntitlementBalance,
  getLeaveEntitlementById,
  getLeaveEntitlements,
  getLeaveEntitlementsForExport,
  updateLeaveEntitlement
} from '@/services/leave-services/leave-entitlement.service';
import type {
  GetLeaveEntitlementsParams,
  LeaveEntitlementPayload
} from '@/types/leave';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).used;
  delete (payload as any).remaining;
  return payload;
}

export async function getLeaveEntitlementsAction(
  params: GetLeaveEntitlementsParams
) {
  try {
    await requirePermission('leave-entitlement', 'view');
    const result = await getLeaveEntitlements({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      staffId: params.staffId,
      leaveTypeId: params.leaveTypeId,
      departmentId: params.departmentId,
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
    console.error('getLeaveEntitlementsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getLeaveEntitlementByIdAction(id: string) {
  try {
    await requirePermission('leave-entitlement', 'view');
    const result = await getLeaveEntitlementById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Leave entitlement not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getLeaveEntitlementByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch leave entitlement.' }
    };
  }
}

export async function getLeaveEntitlementBalanceAction(staffId: string) {
  try {
    await requirePermission('leave-entitlement', 'view');
    const result = await getLeaveEntitlementBalance(staffId);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load leave balance');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getLeaveEntitlementBalanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to load leave balance' }
    };
  }
}

export async function createLeaveEntitlementAction(
  data: LeaveEntitlementPayload
) {
  await requirePermission('leave-entitlement', 'add');
  try {
    const payload = stripAuditFields({ ...data } as Record<string, unknown>);
    const auditUser = await getAuditUser();
    const result = await createLeaveEntitlement(
      payload as unknown as LeaveEntitlementPayload,
      auditUser
    );

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
        action: 'leave.entitlement.created',
        entityType: 'LeaveEntitlement',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath('/leave-entitlement');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('createLeaveEntitlementAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateLeaveEntitlementAction(
  id: string,
  data: Partial<LeaveEntitlementPayload>
) {
  await requirePermission('leave-entitlement', 'edit');
  try {
    const payload = stripAuditFields({ ...data } as Record<string, unknown>);
    const auditUser = await getAuditUser();
    const result = await updateLeaveEntitlement(
      id,
      payload as unknown as Partial<LeaveEntitlementPayload>,
      auditUser
    );

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
        action: 'leave.entitlement.updated',
        entityType: 'LeaveEntitlement',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/leave-entitlement');
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateLeaveEntitlementAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteLeaveEntitlementAction(id: string) {
  await requirePermission('leave-entitlement', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteLeaveEntitlement(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'leave.entitlement.deleted',
        entityType: 'LeaveEntitlement',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/leave-entitlement');
    return { isError: false, data: {}, errors: {} };
  } catch (error: any) {
    console.error('deleteLeaveEntitlementAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function getLeaveEntitlementsExport(params: {
  staffId?: string;
  leaveTypeId?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  try {
    await requirePermission('leave-entitlement', 'view');
    const result = await getLeaveEntitlementsForExport(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export leave entitlements',
        data: []
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      message: result.message
    };
  } catch (error: any) {
    console.error('getLeaveEntitlementsExport error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export leave entitlements',
      data: []
    };
  }
}

/** Staff + published leave types for entitlement form/filters (no staff/leave-types perms required). */
export async function getLeaveEntitlementFormOptionsAction() {
  try {
    await requirePermission('leave-entitlement', 'view');
    const [{ getStaffOptions }, { getLeaveTypeOptions }] = await Promise.all([
      import('@/services/staff-services/staff.service'),
      import('@/services/leave-services/leave-type.service')
    ]);

    const [staffResult, leaveTypeResult] = await Promise.all([
      getStaffOptions(),
      getLeaveTypeOptions()
    ]);

    return {
      isError: false,
      data: {
        staff: staffResult.data ?? [],
        leaveTypes: leaveTypeResult.data ?? []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getLeaveEntitlementFormOptionsAction error:', error);
    return {
      isError: true,
      data: { staff: [], leaveTypes: [] },
      errors: {
        message: error.message ?? 'Failed to load form options'
      }
    };
  }
}
