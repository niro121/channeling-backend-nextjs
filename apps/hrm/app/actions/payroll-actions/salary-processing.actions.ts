'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  approvePayrollRun,
  getSalaryProcessingExportRows,
  getSalaryProcessingWorkspace,
  holdPayrollRun,
  listProcessablePayrollRuns,
  recalculatePayrollStatutory,
  releasePayrollRunHold
} from '@/services/payroll-services/salary-processing.service';
import type {
  SalaryProcessingRunOption,
  SalaryProcessingWorkspaceData
} from '@/types/payroll';

function revalidateProcessingPaths() {
  revalidatePath('/salary-processing');
  revalidatePath('/loans-advances');
  revalidatePath('/salary-generation');
}

export async function listProcessablePayrollRunsAction(): Promise<{
  isError: boolean;
  data: SalaryProcessingRunOption[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await listProcessablePayrollRuns();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to list runs');
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('listProcessablePayrollRunsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getSalaryProcessingWorkspaceAction(
  runId: string
): Promise<{
  isError: boolean;
  data: SalaryProcessingWorkspaceData | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getSalaryProcessingWorkspace(runId);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to load workspace');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getSalaryProcessingWorkspaceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function recalculatePayrollStatutoryAction(
  runId: string
): Promise<{
  isError: boolean;
  data: SalaryProcessingWorkspaceData | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await recalculatePayrollStatutory(runId, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to calculate salary'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-processing.calculated',
        entityType: 'PayrollRun',
        entityId: runId,
        importance: 'medium',
        metadata: {
          code: result.data.runCode,
          staffCount: result.data.summary.staffCount,
          netPayable: result.data.summary.netPayable
        }
      });
    }

    revalidateProcessingPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('recalculatePayrollStatutoryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function approvePayrollRunAction(runId: string): Promise<{
  isError: boolean;
  data: SalaryProcessingWorkspaceData | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await approvePayrollRun(runId, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to approve payroll'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-processing.approved',
        entityType: 'PayrollRun',
        entityId: runId,
        importance: 'high',
        metadata: {
          code: result.data.runCode,
          staffCount: result.data.summary.staffCount,
          netPayable: result.data.summary.netPayable,
          status: result.data.runStatus
        }
      });
    }

    revalidateProcessingPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('approvePayrollRunAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function holdPayrollRunAction(
  runId: string,
  reason = ''
): Promise<{
  isError: boolean;
  data: SalaryProcessingWorkspaceData | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await holdPayrollRun(runId, reason, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to hold payroll'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-processing.held',
        entityType: 'PayrollRun',
        entityId: runId,
        importance: 'high',
        metadata: {
          code: result.data.runCode,
          reason
        }
      });
    }

    revalidateProcessingPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('holdPayrollRunAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function releasePayrollRunHoldAction(runId: string): Promise<{
  isError: boolean;
  data: SalaryProcessingWorkspaceData | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await releasePayrollRunHold(runId, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to release hold'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-processing.released',
        entityType: 'PayrollRun',
        entityId: runId,
        importance: 'medium',
        metadata: { code: result.data.runCode }
      });
    }

    revalidateProcessingPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('releasePayrollRunHoldAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function getSalaryProcessingExportAction(
  runId: string
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getSalaryProcessingExportRows(runId);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Export failed'
      };
    }
    return { success: true, data: result.data ?? [] };
  } catch (error: any) {
    console.error('getSalaryProcessingExportAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Export failed'
    };
  }
}
