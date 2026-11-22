'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createLoanAdvance,
  deleteLoanAdvance,
  getLoanAdvanceById,
  getLoanAdvanceExportRows,
  getLoanAdvanceList,
  getLoanAdvanceSummary,
  updateLoanAdvance
} from '@/services/payroll-services/loan-advance.service';
import type {
  GetLoanAdvanceParams,
  LoanAdvancePayload,
  LoanAdvanceRecord,
  LoanAdvanceSummary
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
  delete (payload as any).bankName;
  delete (payload as any).resignDate;
  delete (payload as any).status;
  delete (payload as any).outstanding;
  return payload;
}

function revalidateLoanAdvancePaths() {
  revalidatePath('/loans-advances');
}

export async function getLoanAdvanceListAction(
  params: GetLoanAdvanceParams = {}
): Promise<{
  isError: boolean;
  data: LoanAdvanceRecord[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getLoanAdvanceList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load loans & advances');
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getLoanAdvanceListAction error:', error);
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

export async function getLoanAdvanceSummaryAction(
  params: GetLoanAdvanceParams = {}
): Promise<{
  isError: boolean;
  data: LoanAdvanceSummary | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getLoanAdvanceSummary(params);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to load summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getLoanAdvanceSummaryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getLoanAdvanceByIdAction(id: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await getLoanAdvanceById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Loan / advance not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getLoanAdvanceByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function createLoanAdvanceAction(
  data: LoanAdvancePayload
): Promise<{
  isError: boolean;
  data: LoanAdvanceRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as LoanAdvancePayload;
    const result = await createLoanAdvance(payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to create loan / advance',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'loans-advances.created',
        entityType: 'LoanAdvance',
        entityId: result.data.id,
        importance: 'medium',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode,
          loanNumber: result.data.loanNumber,
          loanAmount: result.data.loanAmount
        }
      });
    }

    revalidateLoanAdvancePaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createLoanAdvanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateLoanAdvanceAction(
  id: string,
  data: LoanAdvancePayload
): Promise<{
  isError: boolean;
  data: LoanAdvanceRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as LoanAdvancePayload;
    const result = await updateLoanAdvance(id, payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to update loan / advance',
          ...(result.error?.issues ? result.error.issues : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'loans-advances.updated',
        entityType: 'LoanAdvance',
        entityId: id,
        importance: 'medium',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode,
          loanNumber: result.data.loanNumber,
          outstanding: result.data.outstanding
        }
      });
    }

    revalidateLoanAdvancePaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateLoanAdvanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteLoanAdvanceAction(id: string): Promise<{
  isError: boolean;
  data: { deleted: boolean } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'delete');
    const auditUser = await getAuditUser();
    const existing = await getLoanAdvanceById(id);
    const result = await deleteLoanAdvance(id);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to delete loan / advance'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'loans-advances.deleted',
        entityType: 'LoanAdvance',
        entityId: id,
        importance: 'high',
        metadata: existing.data
          ? {
              staffName: existing.data.staffName,
              staffCode: existing.data.staffCode,
              loanNumber: existing.data.loanNumber
            }
          : undefined
      });
    }

    revalidateLoanAdvancePaths();
    return { isError: false, data: { deleted: true }, errors: {} };
  } catch (error: any) {
    console.error('deleteLoanAdvanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function getLoanAdvanceExportAction(
  params: GetLoanAdvanceParams = {}
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getLoanAdvanceExportRows(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Export failed'
      };
    }

    return {
      success: true,
      data: (result.data ?? []).map((row) => ({
        institution: row.institution || '—',
        department: row.department || '—',
        roster: row.roster || '—',
        staffCode: row.staffCode || '—',
        staffName: row.staffName || '—',
        bankName: row.bankName || '—',
        branch: row.branch || '—',
        accountNumber: row.accountNumber || '—',
        startingBalance: String(row.startingBalance),
        loanAmount: String(row.loanAmount),
        monthlyInstallment: String(row.monthlyInstallment),
        outstanding: String(row.outstanding),
        fromDate: row.fromDate ?? '—',
        toDate: row.toDate ?? '—',
        grade: row.grade || '—',
        staffCategory: row.staffCategory || '—',
        designation: row.designation || '—',
        resignDate: row.resignDate ?? '—',
        status: row.status,
        componentName: row.componentName || '—',
        loanNumber: row.loanNumber || '—',
        completionDate: row.completionDate ?? '—',
        createdBy: row.createdBy ?? '—',
        createdAt: row.createdAt ?? '—',
        updatedBy: row.updatedBy ?? '—',
        updatedAt: row.updatedAt ?? '—'
      }))
    };
  } catch (error: any) {
    console.error('getLoanAdvanceExportAction error:', error);
    return {
      success: false,
      message: error.message ?? 'Export failed'
    };
  }
}
