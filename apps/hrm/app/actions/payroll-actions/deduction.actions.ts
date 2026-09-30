'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createDeduction,
  deleteDeduction,
  getDeductionById,
  getDeductionExportRows,
  getDeductionList,
  getDeductionSummary,
  suggestDeductionOrderNo,
  updateDeduction
} from '@/services/payroll-services/deduction.service';
import type {
  DeductionPayload,
  DeductionRecord,
  DeductionSummary,
  GetDeductionParams
} from '@/types/payroll';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  return payload;
}

function revalidateDeductionPaths() {
  revalidatePath('/deductions');
  revalidatePath('/paysheet-components');
}

export async function getDeductionListAction(
  params: GetDeductionParams = {}
): Promise<{
  isError: boolean;
  data: DeductionRecord[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getDeductionList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load deductions');
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getDeductionListAction error:', error);
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

export async function getDeductionSummaryAction(
  params: GetDeductionParams = {}
): Promise<{
  isError: boolean;
  data: DeductionSummary | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getDeductionSummary(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load summary');
    }
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('getDeductionSummaryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error getting summary. Please try again later'
      }
    };
  }
}

export async function getDeductionByIdAction(id: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await getDeductionById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Deduction not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getDeductionByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function suggestDeductionOrderNoAction(kind: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await suggestDeductionOrderNo(kind);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to suggest order no');
    }
    return { isError: false, data: result.data ?? 1, errors: {} };
  } catch (error: any) {
    return {
      isError: true,
      data: 1,
      errors: {
        message: error.message ?? 'Error suggesting order no'
      }
    };
  }
}

export async function createDeductionAction(
  data: DeductionPayload
): Promise<{
  isError: boolean;
  data: DeductionRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as DeductionPayload;
    const result = await createDeduction(payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to create deduction',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'deductions.created',
        entityType: 'PaysheetComponent',
        entityId: result.data.id,
        importance: 'medium'
      });
    }

    revalidateDeductionPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createDeductionAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateDeductionAction(
  id: string,
  data: DeductionPayload
): Promise<{
  isError: boolean;
  data: DeductionRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as DeductionPayload;
    const result = await updateDeduction(id, payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to update deduction',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'deductions.updated',
        entityType: 'PaysheetComponent',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidateDeductionPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateDeductionAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteDeductionAction(id: string): Promise<{
  isError: boolean;
  data: { deleted: boolean } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'delete');
    const auditUser = await getAuditUser();
    const result = await deleteDeduction(id);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to delete deduction'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'deductions.deleted',
        entityType: 'PaysheetComponent',
        entityId: id,
        importance: 'high'
      });
    }

    revalidateDeductionPaths();
    return { isError: false, data: { deleted: true }, errors: {} };
  } catch (error: any) {
    console.error('deleteDeductionAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function exportDeductionsAction(
  params: GetDeductionParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, string>[];
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getDeductionExportRows(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export deductions'
      };
    }
    if (!result.data?.length) {
      return { success: false, message: 'No deductions found' };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('exportDeductionsAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export deductions'
    };
  }
}
