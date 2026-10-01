'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  getPayslipById,
  getPayslipExportRows,
  getPayslipList,
  getPayslipSummary,
  sendPayslipEmail,
  sendPayslipEmailBulk,
  sendPayslipSms,
  sendPayslipSmsBulk
} from '@/services/payroll-services/payslip.service';
import type {
  GetPayslipParams,
  PayslipRecord,
  PayslipSummary
} from '@/types/payroll';

function revalidatePayslipPaths() {
  revalidatePath('/payslips');
}

export async function getPayslipListAction(
  params: GetPayslipParams = {}
): Promise<{
  isError: boolean;
  data: PayslipRecord[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPayslipList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load payslips');
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getPayslipListAction error:', error);
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

export async function getPayslipSummaryAction(
  params: GetPayslipParams = {}
): Promise<{
  isError: boolean;
  data: PayslipSummary | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPayslipSummary(params);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to load summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPayslipSummaryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getPayslipByIdAction(id: string): Promise<{
  isError: boolean;
  data: PayslipRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPayslipById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Payslip not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPayslipByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getPayslipExportAction(
  params: GetPayslipParams = {}
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  message?: string;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getPayslipExportRows(params);
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Export failed'
      };
    }
    return { success: true, data: result.data ?? [] };
  } catch (error: any) {
    console.error('getPayslipExportAction error:', error);
    return { success: false, message: error.message ?? 'Export failed' };
  }
}

export async function sendPayslipEmailAction(id: string): Promise<{
  isError: boolean;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await sendPayslipEmail(id);
    if (!result.success) {
      return {
        isError: true,
        errors: { message: result.error?.message ?? 'Failed to send email' }
      };
    }
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'payslips.emailed',
        entityType: 'Payslip',
        entityId: id,
        importance: 'medium'
      });
    }
    revalidatePayslipPaths();
    return { isError: false, errors: {} };
  } catch (error: any) {
    console.error('sendPayslipEmailAction error:', error);
    return {
      isError: true,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function sendPayslipSmsAction(id: string): Promise<{
  isError: boolean;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await sendPayslipSms(id);
    if (!result.success) {
      return {
        isError: true,
        errors: { message: result.error?.message ?? 'Failed to send SMS' }
      };
    }
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'payslips.sms',
        entityType: 'Payslip',
        entityId: id,
        importance: 'medium'
      });
    }
    revalidatePayslipPaths();
    return { isError: false, errors: {} };
  } catch (error: any) {
    console.error('sendPayslipSmsAction error:', error);
    return {
      isError: true,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function sendPayslipEmailBulkAction(
  params: GetPayslipParams = {}
): Promise<{
  isError: boolean;
  data: { sent: number; skipped: number; failed: number } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await sendPayslipEmailBulk(params);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Bulk email failed' }
      };
    }
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'payslips.emailed-bulk',
        entityType: 'Payslip',
        importance: 'high',
        metadata: result.data
      });
    }
    revalidatePayslipPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('sendPayslipEmailBulkAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function sendPayslipSmsBulkAction(
  params: GetPayslipParams = {}
): Promise<{
  isError: boolean;
  data: { sent: number; skipped: number; failed: number } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await sendPayslipSmsBulk(params);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Bulk SMS failed' }
      };
    }
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'payslips.sms-bulk',
        entityType: 'Payslip',
        importance: 'high',
        metadata: result.data
      });
    }
    revalidatePayslipPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('sendPayslipSmsBulkAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
