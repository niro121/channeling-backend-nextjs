'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { getSmsReportService } from '@/services/reports/sms.report.service';
import { SmsReportExportRow, SmsReportQuery } from '@/types/reports/sms.report';

export async function getSmsReportData(query: SmsReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getSmsReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message ?? result.error?.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch SMS report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportSmsReportData(
  query: SmsReportQuery
): Promise<{ success: boolean; data?: SmsReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getSmsReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? result.error?.message ?? 'No data available' };
    }

    const mapped: SmsReportExportRow[] = result.data.map((row) => ({
      dateTime: row.createdAt ? moment(row.createdAt).format('DD/MM/YYYY hh:mm A') : '-',
      status: row.status === 0 ? 'Sent' : 'Failed',
      source: row.name ?? '-',
      phone: row.phone ?? '-',
      message: row.template ?? '-',
      count: String(row.count ?? 0),
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.sms-report.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mapped.length },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export SMS report';
    return { success: false, message: msg };
  }
}
