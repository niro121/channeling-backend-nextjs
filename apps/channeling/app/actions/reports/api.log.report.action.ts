'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApiLogReportService } from '@/services/reports/api.log.report.service';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { ApiLogReportQuery, ApiLogReportExportRow } from '@/types/reports/api.log';

export async function getApiLogReportData(query: ApiLogReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getApiLogReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message ?? result.error?.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch API log report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportApiLogReportData(
  query: ApiLogReportQuery
): Promise<{ success: boolean; data?: ApiLogReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getApiLogReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? result.error?.message ?? 'No data available' };
    }
    const mapped: ApiLogReportExportRow[] = result.data.map((row: any) => ({
      id: row.id ?? '-',
      dateTime: row.createdAt ? moment(row.createdAt).format('DD/MM/YYYY hh:mm A') : '-',
      duration: row.duration != null ? `${row.duration}s` : '-',
      api: row.endpoint ?? '-',
      uuid: row.uuid ?? '-',
      errorStatus: row.errorStatus ? (typeof row.errorStatus === 'string' ? row.errorStatus : 'Error') : 'Success',
      body: row.requestBody || row.responseBody || '-'
    }));
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.api-log.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mapped.length },
      });
    }
    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}
