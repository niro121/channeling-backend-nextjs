'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDoctorLeaveReportService } from '@/services/reports/doctor.leave.report.service';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';

export type DoctorLeaveReportQuery = {
  fromDateTime?: string;
  toDateTime?: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  specialityId?: string;
  doctorId?: string;
};

export type DoctorLeaveReportExportRow = {
  doctorCode: string;
  doctorName: string;
  fromDate: string;
  toDate: string;
  status: string;
  remarks: string;
  sessionCount: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

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
    const mapped: DoctorLeaveReportExportRow[] = result.data.map((row: any) => {
      const sessions = Array.isArray(row.sessions) ? row.sessions : [];
      return {
        doctorCode: row.doctor?.code ?? '-',
        doctorName: row.doctor?.name ?? '-',
        fromDate: row.fromDate ? moment(row.fromDate).format('YYYY-MM-DD') : '-',
        toDate: row.toDate ? moment(row.toDate).format('YYYY-MM-DD') : '-',
        status: row.status === 1 ? 'Active' : 'Cancel',
        remarks: row.remarks ?? '-',
        sessionCount: String(sessions.length),
        createdBy: row.createdUser?.name ?? '-',
        createdAt: row.createdAt ? moment(row.createdAt).format('DD/MM/YYYY HH:mm') : '-',
        updatedBy: row.updatedUser?.name ?? '-',
        updatedAt: row.updatedAt ? moment(row.updatedAt).format('DD/MM/YYYY HH:mm') : '-',
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
