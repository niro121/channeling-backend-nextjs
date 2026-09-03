'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSmsLogReportService } from '@/services/reports/sms.log.report.service';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import {SmsLogReportQuery, SmsLogReportExportRow} from '@/types/reports/sms.log'

export async function getSmsLogReportData(query: SmsLogReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getSmsLogReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message ?? result.error?.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch SMS log report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportSmsLogReportData(
  query: SmsLogReportQuery
): Promise<{ success: boolean; data?: SmsLogReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getSmsLogReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? result.error?.message ?? 'No data available' };
    }
    const mapped: SmsLogReportExportRow[] = result.data.map((row: any) => ({
      name: row.name ?? '-',
      phone: row.phone ?? '-',
      template: row.template ?? '-',
      createdDate: row.createdAt ? moment(row.createdAt).format('DD/MM/YYYY hh:mm A') : '-',
      status: row.status === 0 ? 'Sent' : 'Failure',
      count: String(row.count ?? 0),
    }));
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.sms-log.exported',
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
