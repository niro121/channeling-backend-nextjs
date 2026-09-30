'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import {
  checkPermission,
  requirePermission
} from '@/lib/server-permissions';
import { getStaffOptions } from '@/services/staff-services/staff.service';
import {
  checkPaysheetAssignmentOverlap,
  createPaysheetAssignment,
  deletePaysheetAssignment,
  getPaysheetAssignmentById,
  getPaysheetAssignmentExportRows,
  getPaysheetAssignmentHistory,
  getPaysheetAssignmentList,
  updatePaysheetAssignment
} from '@/services/payroll-services/paysheet-assignment.service';
import type {
  GetPaysheetAssignmentParams,
  PaysheetAssignmentHistoryEntry,
  PaysheetAssignmentOverlap,
  PaysheetAssignmentPayload,
  PaysheetAssignmentRecord,
  PaysheetStaffOption
} from '@/types/payroll';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).staffName;
  delete (payload as any).staffCode;
  delete (payload as any).componentName;
  delete (payload as any).institution;
  delete (payload as any).department;
  delete (payload as any).roster;
  delete (payload as any).grade;
  delete (payload as any).staffCategory;
  delete (payload as any).designation;
  delete (payload as any).status;
  return payload;
}

function revalidateAssignmentPaths() {
  revalidatePath('/assign-paysheet-component');
  revalidatePath('/bulk-assign-paysheet-component');
}

export async function getPaysheetAssignmentListAction(
  params: GetPaysheetAssignmentParams = {}
): Promise<{
  isError: boolean;
  data: PaysheetAssignmentRecord[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPaysheetAssignmentList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load assignments');
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getPaysheetAssignmentListAction error:', error);
    return {
      isError: true,
      data: null,
      total: 0,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getPaysheetAssignmentByIdAction(id: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPaysheetAssignmentById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Assignment not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPaysheetAssignmentByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

/** Staff combobox for payroll assign screens (payroll or staff view). */
export async function getPayrollStaffOptionsAction(): Promise<{
  isError: boolean;
  data: PaysheetStaffOption[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    const canPayroll = await checkPermission('payroll', 'view');
    const canStaff = await checkPermission('staff', 'view');
    if (!canPayroll && !canStaff) {
      throw new Error("Access denied: You don't have permission to view staff");
    }
    const result = await getStaffOptions();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load staff options');
    }
    return {
      isError: false,
      data: (result.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code
      })),
      errors: {}
    };
  } catch (error: any) {
    console.error('getPayrollStaffOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error getting staff options. Please try again later'
      }
    };
  }
}

export async function createPaysheetAssignmentAction(
  data: PaysheetAssignmentPayload
): Promise<{
  isError: boolean;
  data: PaysheetAssignmentRecord | null;
  overlaps: PaysheetAssignmentOverlap[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as PaysheetAssignmentPayload;
    const result = await createPaysheetAssignment(payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        overlaps: result.overlaps ?? null,
        errors: {
          message: result.error?.message ?? 'Failed to create assignment',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'assign-paysheet-component.created',
        entityType: 'PaysheetAssignment',
        entityId: result.data.id,
        importance: 'medium',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode,
          componentName: result.data.componentName,
          value: result.data.value
        }
      });
    }

    revalidateAssignmentPaths();
    return {
      isError: false,
      data: result.data,
      overlaps: null,
      errors: {}
    };
  } catch (error: any) {
    console.error('createPaysheetAssignmentAction error:', error);
    return {
      isError: true,
      data: null,
      overlaps: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updatePaysheetAssignmentAction(
  id: string,
  data: PaysheetAssignmentPayload
): Promise<{
  isError: boolean;
  data: PaysheetAssignmentRecord | null;
  overlaps: PaysheetAssignmentOverlap[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as PaysheetAssignmentPayload;
    const result = await updatePaysheetAssignment(id, payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        overlaps: result.overlaps ?? null,
        errors: {
          message: result.error?.message ?? 'Failed to update assignment',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'assign-paysheet-component.updated',
        entityType: 'PaysheetAssignment',
        entityId: id,
        importance: 'medium',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode,
          componentName: result.data.componentName,
          value: result.data.value
        }
      });
    }

    revalidateAssignmentPaths();
    return {
      isError: false,
      data: result.data,
      overlaps: null,
      errors: {}
    };
  } catch (error: any) {
    console.error('updatePaysheetAssignmentAction error:', error);
    return {
      isError: true,
      data: null,
      overlaps: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deletePaysheetAssignmentAction(id: string): Promise<{
  isError: boolean;
  data: { deleted: boolean } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'delete');
    const auditUser = await getAuditUser();
    const existing = await getPaysheetAssignmentById(id);
    const result = await deletePaysheetAssignment(id);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to delete assignment'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'assign-paysheet-component.deleted',
        entityType: 'PaysheetAssignment',
        entityId: id,
        importance: 'high',
        metadata: existing.data
          ? {
              staffName: existing.data.staffName,
              staffCode: existing.data.staffCode,
              componentName: existing.data.componentName,
              value: existing.data.value
            }
          : undefined
      });
    }

    revalidateAssignmentPaths();
    return { isError: false, data: { deleted: true }, errors: {} };
  } catch (error: any) {
    console.error('deletePaysheetAssignmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function getPaysheetAssignmentHistoryAction(id: string): Promise<{
  isError: boolean;
  data: PaysheetAssignmentHistoryEntry[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPaysheetAssignmentHistory(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load history');
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getPaysheetAssignmentHistoryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error loading history. Please try again later'
      }
    };
  }
}

export async function checkPaysheetAssignmentOverlapAction(
  data: PaysheetAssignmentPayload,
  excludeId?: string
): Promise<{
  isError: boolean;
  data: PaysheetAssignmentOverlap[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await checkPaysheetAssignmentOverlap(data, excludeId);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to check overlap');
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error checking overlap'
      }
    };
  }
}

export async function exportPaysheetAssignmentsAction(
  params: GetPaysheetAssignmentParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, string>[];
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPaysheetAssignmentExportRows(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export assignments'
      };
    }
    if (!result.data?.length) {
      return { success: false, message: 'No assignments found' };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('exportPaysheetAssignmentsAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export assignments'
    };
  }
}
