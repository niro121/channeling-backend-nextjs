'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { requirePermission } from '@/lib/server-permissions';
import {
  getDepartmentReport,
  getDepartmentReportForExport
} from '@/services/report-services/department-reports.service';
import type { GetDepartmentReportParams } from '@/types/reports';

function listParams(
  params: GetDepartmentReportParams
): GetDepartmentReportParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    fromDate: params.fromDate,
    toDate: params.toDate,
    institution: params.institution,
    departmentId: params.departmentId,
    keyword: params.keyword,
    category: params.category
  };
}

export async function getDepartmentReportAction(
  params: GetDepartmentReportParams = {}
) {
  try {
    await requirePermission('reports', 'view');
    const result = await getDepartmentReport(listParams(params));
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load department report'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getDepartmentReportAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load department report'
      }
    };
  }
}

export async function getDepartmentReportExportAction(
  params: GetDepartmentReportParams = {}
) {
  try {
    await requirePermission('reports', 'view');
    const result = await getDepartmentReportForExport(listParams(params));
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.message ?? 'No department report found',
        data: [] as Record<string, unknown>[]
      };
    }
    return {
      success: true,
      data: result.data as unknown as Record<string, unknown>[],
      totalRecords: result.totalRecords ?? result.data.length
    };
  } catch (error: any) {
    console.error('getDepartmentReportExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export department report',
      data: [] as Record<string, unknown>[]
    };
  }
}

export async function logDepartmentReportVisitAction() {
  try {
    await requirePermission('reports', 'view');
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return;
    logActivityNonBlocking({
      userId,
      action: 'reports.department.visited',
      entityType: 'report',
      importance: 'low'
    });
  } catch {
    // ignore visit logging failures
  }
}
