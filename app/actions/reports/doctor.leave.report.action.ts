'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDoctorLeaveReportService } from '@/services/reports/doctor.leave.report.service';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import {DoctorLeaveReportQuery, DoctorLeaveReportExportRow} from '@/types/reports/doctor.leave'

export async function getDoctorLeaveReportData(query: DoctorLeaveReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getDoctorLeaveReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctor leave report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportDoctorLeaveReportData(
  query: DoctorLeaveReportQuery
): Promise<{ success: boolean; data?: DoctorLeaveReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getDoctorLeaveReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }
    const mapped: DoctorLeaveReportExportRow[] = result.data.map((row: any) => ({
      doctorCode: row.doctor?.code ?? '-',
      doctorName: row.doctor?.name ?? '-',
      leaveDate: row.fromDate ? moment(row.fromDate).format('DD/MM/YYYY') : '-',
      leaveSessions: row.leaveSessionsFormatted ?? '-',
      leaveRemark: row.remarks ?? '-',
      leaveCreator: row.createdUser?.name ?? '-',
      leaveCreatorAt: row.createdAt ? moment(row.createdAt).format('DD/MM/YYYY hh:mm A') : '-',
      leaveUpdator: row.updatedUser?.name ?? '-',
      leaveUpdatorAt: row.updatedAt ? moment(row.updatedAt).format('DD/MM/YYYY hh:mm A') : '-',
      status: row.status === 1 ? 'Active' : 'Cancel',
    }));
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.doctor-leave.exported',
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
