'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createAllowance,
  deleteAllowance,
  getAllowanceById,
  getAllowanceExportRows,
  getAllowanceList,
  getAllowanceSummary,
  suggestAllowanceOrderNo,
  updateAllowance
} from '@/services/payroll-services/allowance.service';
import type {
  AllowancePayload,
  AllowanceRecord,
  AllowanceSummary,
  GetAllowanceParams
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

function revalidateAllowancePaths() {
  revalidatePath('/allowances');
  revalidatePath('/paysheet-components');
}

export async function getAllowanceListAction(
  params: GetAllowanceParams = {}
): Promise<{
  isError: boolean;
  data: AllowanceRecord[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getAllowanceList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load allowances');
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getAllowanceListAction error:', error);
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

export async function getAllowanceSummaryAction(
  params: GetAllowanceParams = {}
): Promise<{
  isError: boolean;
  data: AllowanceSummary | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getAllowanceSummary(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load summary');
    }
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('getAllowanceSummaryAction error:', error);
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

export async function getAllowanceByIdAction(id: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await getAllowanceById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Allowance not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAllowanceByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function suggestAllowanceOrderNoAction(kind: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await suggestAllowanceOrderNo(kind);
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

export async function createAllowanceAction(
  data: AllowancePayload
): Promise<{
  isError: boolean;
  data: AllowanceRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as AllowancePayload;
    const result = await createAllowance(payload, auditUser);
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
        action: 'allowances.created',
        entityType: 'PaysheetComponent',
        entityId: result.data.id,
        importance: 'medium'
      });
    }

    revalidateAllowancePaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createAllowanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateAllowanceAction(
  id: string,
  data: AllowancePayload
): Promise<{
  isError: boolean;
  data: AllowanceRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as AllowancePayload;
    const result = await updateAllowance(id, payload, auditUser);
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
        action: 'allowances.updated',
        entityType: 'PaysheetComponent',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidateAllowancePaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateAllowanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteAllowanceAction(id: string): Promise<{
  isError: boolean;
  data: { deleted: boolean } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'delete');
    const auditUser = await getAuditUser();
    const result = await deleteAllowance(id);
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
        action: 'allowances.deleted',
        entityType: 'PaysheetComponent',
        entityId: id,
        importance: 'high'
      });
    }

    revalidateAllowancePaths();
    return { isError: false, data: { deleted: true }, errors: {} };
  } catch (error: any) {
    console.error('deleteAllowanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function exportAllowancesAction(
  params: GetAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, string>[];
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getAllowanceExportRows(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export allowances'
      };
    }
    if (!result.data?.length) {
      return { success: false, message: 'No allowances found' };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('exportAllowancesAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export allowances'
    };
  }
}
