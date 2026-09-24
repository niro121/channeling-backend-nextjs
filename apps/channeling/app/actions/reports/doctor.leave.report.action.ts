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
      message: result.message ?? result.error?.message,
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
      return { success: false, message: result.message ?? result.error?.message ?? 'No data available' };
    }
    const formatUserAt = (
      user: { name?: string | null; staff?: { code?: string | null } | null } | null | undefined,
      at: Date | string | null | undefined
    ): string => {
      const name = user?.name?.trim() || '—';
      const code = user?.staff?.code?.trim();
      const displayName = code ? `${name} (${code})` : name;
      const date = at ? moment(at).format('DD/MM/YYYY hh:mm A') : '—';
      return `${displayName}\n${date}`;
    };

    const mapped: DoctorLeaveReportExportRow[] = result.data.map((row: any) => {
      const leaveDate = row.leaveDate ? moment(row.leaveDate) : null;
      const dateLine = leaveDate?.isValid() ? leaveDate.format('Do MMMM YYYY') : '-';
      const sessionTimes = row.leaveSessionFormatted ?? '-';
      return {
        doctorCode: row.doctor?.code ?? '-',
        doctorName: row.doctor?.name ?? '-',
        branch: row.branchName?.trim() || '—',
        leaveDate: leaveDate?.isValid() ? leaveDate.format('DD/MM/YYYY') : '-',
        leaveSessions: `${dateLine}\n${sessionTimes}`,
        leaveRemark: row.remarks ?? '-',
        leaveUpdator: formatUserAt(row.updatedUser, row.updatedAt),
        leaveCreator: formatUserAt(row.createdUser, row.createdAt),
      };
    });
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
