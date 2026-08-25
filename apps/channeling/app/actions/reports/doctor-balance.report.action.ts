'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import { getDoctorBalanceReportService } from '@/services/reports/doctor-balance.report.service';
import type {
  DoctorBalanceReportExportRow,
  DoctorBalanceReportQuery,
} from '@/types/reports/doctor-balance';

export async function getDoctorBalanceReportData(query: DoctorBalanceReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getDoctorBalanceReportService(query);
    const session = await getServerSession(authOptions);
    if (session?.user?.id && result.success) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.doctor-balance.viewed',
        entityType: 'Report',
        importance: 'low',
        metadata: {
          asOfDate: query.asOfDate,
          doctorId: query.doctorId ?? '__all__',
          specialityId: query.specialityId ?? '__all__',
          status: query.status ?? '__all__',
        },
      });
    }
    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctor balance report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportDoctorBalanceReportData(
  query: DoctorBalanceReportQuery
): Promise<{ success: boolean; data?: DoctorBalanceReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getDoctorBalanceReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: DoctorBalanceReportExportRow[] = result.data.map((r, i) => ({
      no: String(i + 1),
      status: r.status === 1 ? 'Active' : 'Inactive',
      doctorCode: r.doctorCode,
      doctorName: r.doctorName,
      speciality: r.speciality,
      doctorPhoneNo: r.doctorPhoneNo,
      doctorAddress: r.doctorAddress,
      doctorBalance: formatLKR(r.doctorBalance),
    }));

    const balanceTotal = result.data.reduce((sum, r) => sum + (Number(r.doctorBalance) || 0), 0);
    mapped.push({
      no: '',
      status: '',
      doctorCode: '',
      doctorName: 'Total',
      speciality: '',
      doctorPhoneNo: '',
      doctorAddress: '',
      doctorBalance: formatLKR(balanceTotal),
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.doctor-balance.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          asOfDate: query.asOfDate,
          doctorId: query.doctorId ?? '__all__',
          specialityId: query.specialityId ?? '__all__',
          status: query.status ?? '__all__',
          count: result.data.length,
          exportedAt: moment().toISOString(),
        },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}
