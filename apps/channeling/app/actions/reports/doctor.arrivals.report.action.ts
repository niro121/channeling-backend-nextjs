'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import moment from 'moment';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getDoctorArrivalsReportService } from '@/services/reports/doctor.arrivals.report.service';
import type {
  DoctorArrivalsReportQuery,
  DoctorArrivalsReportExportRow,
} from '@/types/reports/doctor.arrivals';

export async function getDoctorArrivalsReportData(query: DoctorArrivalsReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getDoctorArrivalsReportService(query);
    if (!result.success) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: result.error?.message ?? result.message ?? 'Failed to fetch doctor arrivals report',
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctor arrivals report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportDoctorArrivalsReportData(
  query: DoctorArrivalsReportQuery
): Promise<{ success: boolean; data?: DoctorArrivalsReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getDoctorArrivalsReportService(query);
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.error?.message ?? result.message ?? 'No data available',
      };
    }

    const mapped: DoctorArrivalsReportExportRow[] = result.data.map((row) => ({
      doctorCode: row.doctorCode,
      doctorName: row.doctorName,
      roomAllocatedBy: row.roomAllocatedBy,
      sessionDate: formatSessionCalendarDate(row.sessionDate),
      sessionStartTime: formatTimeSl(row.sessionStartTime),
      sessionStatus: row.sessionStatus === 1 ? 'Active' : 'Leave',
      doctorArrivalTime: row.doctorArrivalDisplay,
      doctorDepartureTime: row.doctorDepartureDisplay,
      roomReleasedBy: row.roomReleasedBy,
      roomNumber: row.roomNumber,
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.doctor-arrivals.exported',
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

function formatSessionCalendarDate(d: Date): string {
  const x = d instanceof Date ? d : new Date(d);
  return moment.utc(x).format('Do MMMM YYYY');
}

function formatTimeSl(d: Date): string {
  return moment(d).utcOffset(330).format('h.mm A');
}
