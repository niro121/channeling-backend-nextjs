'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import {
  checkPermission,
  requirePermission
} from '@/lib/server-permissions';
import { getStaffOptions } from '@/services/staff-services/staff.service';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getDesignationOptions } from '@/services/hr-admin-services/designation.service';
import { getManageRosterOptions } from '@/services/hr-admin-services/manage-roster.service';
import {
  checkPaysheetAssignmentOverlap,
  createPaysheetAssignment,
  deletePaysheetAssignment,
  findBulkPaysheetAssignmentOverlaps,
  bulkCreatePaysheetAssignments,
  getBulkAssignableStaffList,
  getPaysheetAssignmentById,
  getPaysheetAssignmentExportRows,
  getPaysheetAssignmentHistory,
  getPaysheetAssignmentList,
  getRecentPaysheetAssignments,
  updatePaysheetAssignment
} from '@/services/payroll-services/paysheet-assignment.service';
import type {
  BulkPaysheetAssignPayload,
  BulkPaysheetAssignResult,
  BulkPaysheetStaffRow,
  GetBulkAssignableStaffParams,
  GetPaysheetAssignmentParams,
  PaysheetAssignmentHistoryEntry,
  PaysheetAssignmentOverlap,
  PaysheetAssignmentPayload,
  PaysheetAssignmentRecord,
  PaysheetStaffOption,
  SalaryFilterOption
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

/**
 * Department / Designation / Roster filter options from their masters.
 * Readable with payroll view so payroll screens do not require org/HR-admin grants.
 */
export async function getPayrollEmploymentFilterOptionsAction(): Promise<{
  isError: boolean;
  data: {
    departments: SalaryFilterOption[];
    designations: SalaryFilterOption[];
    rosters: SalaryFilterOption[];
  } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const [deptRes, desigRes, rosterRes] = await Promise.all([
      getDepartmentOptions(),
      getDesignationOptions(),
      getManageRosterOptions()
    ]);

    return {
      isError: false,
      data: {
        departments: deptRes.success ? (deptRes.data ?? []) : [],
        designations: desigRes.success ? (desigRes.data ?? []) : [],
        rosters: rosterRes.success ? (rosterRes.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getPayrollEmploymentFilterOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ??
          'Error getting employment filter options. Please try again later'
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

export async function getBulkAssignableStaffListAction(
  params: GetBulkAssignableStaffParams = {}
): Promise<{
  isError: boolean;
  data: BulkPaysheetStaffRow[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getBulkAssignableStaffList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load staff');
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getBulkAssignableStaffListAction error:', error);
    return {
      isError: true,
      data: null,
      total: 0,
      errors: {
        message: error.message ?? 'Error getting staff. Please try again later'
      }
    };
  }
}

export async function getRecentPaysheetAssignmentsAction(
  limit = 20
): Promise<{
  isError: boolean;
  data: PaysheetAssignmentRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getRecentPaysheetAssignments(limit);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load recent');
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getRecentPaysheetAssignmentsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error loading recent assignments'
      }
    };
  }
}

export async function checkBulkPaysheetAssignmentOverlapAction(params: {
  staffIds: string[];
  componentId: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
}): Promise<{
  isError: boolean;
  data: PaysheetAssignmentOverlap[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await findBulkPaysheetAssignmentOverlaps({
      staffIds: params.staffIds,
      componentId: params.componentId,
      effectiveFrom: new Date(params.effectiveFrom),
      effectiveTo: params.effectiveTo ? new Date(params.effectiveTo) : null
    });
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to check overlaps');
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error checking overlaps'
      }
    };
  }
}

export async function bulkCreatePaysheetAssignmentsAction(
  data: BulkPaysheetAssignPayload
): Promise<{
  isError: boolean;
  data: BulkPaysheetAssignResult | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const result = await bulkCreatePaysheetAssignments(data, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: result.data ?? null,
        errors: {
          message: result.error?.message ?? 'Failed to bulk assign',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id && result.data.created.length) {
      for (const created of result.data.created) {
        logActivityNonBlocking({
          userId: auditUser.id,
          action: 'bulk-assign-paysheet-component.created',
          entityType: 'PaysheetAssignment',
          entityId: created.id,
          importance: 'medium',
          metadata: {
            staffName: created.staffName,
            staffCode: created.staffCode,
            componentName: created.componentName,
            value: created.value,
            mode: data.mode
          }
        });
      }
    }

    revalidateAssignmentPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('bulkCreatePaysheetAssignmentsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
