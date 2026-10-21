'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  clearPayrollRun,
  generatePayrollRun,
  getActivePayrollRunForCycle,
  getPayrollRunById,
  getPayrollRunPreviewExportRows,
  getPayrollRunStaffExportRows,
  savePayrollRun
} from '@/services/payroll-services/payroll-run.service';
import type {
  GeneratePayrollRunPayload,
  SalaryGenerationFillMode,
  SalaryGenerationResult,
  SalaryGenerationStaffFilters
} from '@/types/payroll';

function revalidateSalaryGenerationPaths() {
  revalidatePath('/salary-generation');
}

export async function generatePayrollRunAction(
  data: GeneratePayrollRunPayload
): Promise<{
  isError: boolean;
  data: SalaryGenerationResult | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const result = await generatePayrollRun(data, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to generate salary',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-generation.generated',
        entityType: 'PayrollRun',
        entityId: result.data.run.id,
        importance: 'high',
        metadata: {
          code: result.data.run.code,
          cycleLabel: result.data.run.cycleLabel,
          staffCount: result.data.run.staffCount,
          netPayable: result.data.run.summary.netPayable
        }
      });
    }

    revalidateSalaryGenerationPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('generatePayrollRunAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function refillPayrollRunAction(
  runId: string,
  fillMode: SalaryGenerationFillMode,
  filters: SalaryGenerationStaffFilters = {}
): Promise<{
  isError: boolean;
  data: SalaryGenerationResult | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const existing = await getPayrollRunById(runId);
    if (!existing.success || !existing.data) {
      return {
        isError: true,
        data: null,
        errors: { message: existing.error?.message ?? 'Payroll run not found' }
      };
    }

    const run = existing.data.run;
    return generatePayrollRunAction({
      salaryCycleId: run.salaryCycleId,
      salaryFromDate: run.salaryFromDate,
      salaryToDate: run.salaryToDate,
      workedFromDate: run.workedFromDate,
      workedToDate: run.workedToDate,
      fillMode,
      filters
    });
  } catch (error: any) {
    console.error('refillPayrollRunAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function savePayrollRunAction(runId: string): Promise<{
  isError: boolean;
  data: SalaryGenerationResult | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await savePayrollRun(runId, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to save salary'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-generation.saved',
        entityType: 'PayrollRun',
        entityId: runId,
        importance: 'high',
        metadata: {
          code: result.data.run.code,
          staffCount: result.data.run.staffCount,
          status: result.data.run.status
        }
      });
    }

    revalidateSalaryGenerationPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('savePayrollRunAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function clearPayrollRunAction(runId: string): Promise<{
  isError: boolean;
  data: { deleted: boolean } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'delete');
    const auditUser = await getAuditUser();
    const existing = await getPayrollRunById(runId);
    const result = await clearPayrollRun(runId);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to clear salary'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-generation.cleared',
        entityType: 'PayrollRun',
        entityId: runId,
        importance: 'high',
        metadata: existing.data
          ? {
              code: existing.data.run.code,
              cycleLabel: existing.data.run.cycleLabel
            }
          : undefined
      });
    }

    revalidateSalaryGenerationPaths();
    return { isError: false, data: { deleted: true }, errors: {} };
  } catch (error: any) {
    console.error('clearPayrollRunAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function getActivePayrollRunForCycleAction(
  salaryCycleId: string
): Promise<{
  isError: boolean;
  data: SalaryGenerationResult | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getActivePayrollRunForCycle(salaryCycleId);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load payroll run'
        }
      };
    }
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('getActivePayrollRunForCycleAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getPayrollRunStaffExportAction(
  runId: string
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPayrollRunStaffExportRows(runId);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Export failed'
      };
    }
    return { success: true, data: result.data ?? [] };
  } catch (error: any) {
    console.error('getPayrollRunStaffExportAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Export failed'
    };
  }
}

export async function getPayrollRunPreviewExportAction(
  runId: string
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPayrollRunPreviewExportRows(runId);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Export failed'
      };
    }
    return { success: true, data: result.data ?? [] };
  } catch (error: any) {
    console.error('getPayrollRunPreviewExportAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Export failed'
    };
  }
}
