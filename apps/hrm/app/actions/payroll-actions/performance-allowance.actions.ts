'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createPerformanceAllowance,
  deletePerformanceAllowance,
  getPerformanceAllowanceById,
  getPerformanceAllowanceExportRows,
  getPerformanceAllowanceList,
  getPerformanceAllowanceSummary,
  updatePerformanceAllowance
} from '@/services/payroll-services/performance-allowance.service';
import type {
  GetPerformanceAllowanceParams,
  PerformanceAllowancePayload,
  PerformanceAllowanceRecord,
  PerformanceAllowanceSummary
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
  delete (payload as any).department;
  delete (payload as any).designation;
  return payload;
}

function revalidatePerformanceAllowancePaths() {
  revalidatePath('/performance-allowance');
}

export async function getPerformanceAllowanceListAction(
  params: GetPerformanceAllowanceParams = {}
): Promise<{
  isError: boolean;
  data: PerformanceAllowanceRecord[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPerformanceAllowanceList(params);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Failed to load performance allowances'
      );
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getPerformanceAllowanceListAction error:', error);
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

export async function getPerformanceAllowanceSummaryAction(
  params: GetPerformanceAllowanceParams = {}
): Promise<{
  isError: boolean;
  data: PerformanceAllowanceSummary | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPerformanceAllowanceSummary(params);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to load summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPerformanceAllowanceSummaryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getPerformanceAllowanceByIdAction(id: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPerformanceAllowanceById(id);
    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message ?? 'Performance allowance not found'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPerformanceAllowanceByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function createPerformanceAllowanceAction(
  data: PerformanceAllowancePayload
): Promise<{
  isError: boolean;
  data: PerformanceAllowanceRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as PerformanceAllowancePayload;
    const result = await createPerformanceAllowance(payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to create allowance',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'performance-allowance.created',
        entityType: 'PerformanceAllowance',
        entityId: result.data.id,
        importance: 'medium',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode,
          mode: result.data.mode,
          value: result.data.value
        }
      });
    }

    revalidatePerformanceAllowancePaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createPerformanceAllowanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updatePerformanceAllowanceAction(
  id: string,
  data: PerformanceAllowancePayload
): Promise<{
  isError: boolean;
  data: PerformanceAllowanceRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as PerformanceAllowancePayload;
    const result = await updatePerformanceAllowance(id, payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to update allowance',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'performance-allowance.updated',
        entityType: 'PerformanceAllowance',
        entityId: id,
        importance: 'medium',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode,
          mode: result.data.mode,
          value: result.data.value
        }
      });
    }

    revalidatePerformanceAllowancePaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updatePerformanceAllowanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deletePerformanceAllowanceAction(id: string): Promise<{
  isError: boolean;
  data: { deleted: boolean } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'delete');
    const auditUser = await getAuditUser();
    const existing = await getPerformanceAllowanceById(id);
    const result = await deletePerformanceAllowance(id);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to delete allowance'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'performance-allowance.deleted',
        entityType: 'PerformanceAllowance',
        entityId: id,
        importance: 'high',
        metadata: existing.data
          ? {
              staffName: existing.data.staffName,
              staffCode: existing.data.staffCode,
              mode: existing.data.mode,
              value: existing.data.value
            }
          : undefined
      });
    }

    revalidatePerformanceAllowancePaths();
    return { isError: false, data: { deleted: true }, errors: {} };
  } catch (error: any) {
    console.error('deletePerformanceAllowanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function getPerformanceAllowanceExportAction(
  params: GetPerformanceAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPerformanceAllowanceExportRows(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Export failed'
      };
    }

    const records = result.data ?? [];
    return {
      success: true,
      data: records.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        designation: row.designation,
        value: String(row.value),
        effectiveFrom: row.effectiveFrom ?? '—',
        effectiveTo: row.effectiveTo ?? '—',
        createdBy: row.createdBy ?? '—',
        createdAt: row.createdAt ?? '—',
        updatedBy: row.updatedBy ?? '—',
        updatedAt: row.updatedAt ?? '—'
      }))
    };
  } catch (error: any) {
    console.error('getPerformanceAllowanceExportAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Export failed'
    };
  }
}
