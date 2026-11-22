'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireReport } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { getDpayDoctorBalanceReportService } from '@/services/reports/dpay-doctor-balance.report.service';
import type {
  DpayDoctorBalanceReportExportRow,
  DpayDoctorBalanceReportQuery,
} from '@/types/reports/dpay-doctor-balance';

export async function getDpayDoctorBalanceReportData(query: DpayDoctorBalanceReportQuery) {
  await requireReport('dpay-doctor-balance');
  try {
    const result = await getDpayDoctorBalanceReportService(query);
    const session = await getServerSession(authOptions);
    if (session?.user?.id && result.success) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.dpay-doctor-balance.viewed',
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
    const msg = error instanceof Error ? error.message : 'Failed to fetch DPAY doctor balance report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportDpayDoctorBalanceReportData(
  query: DpayDoctorBalanceReportQuery
): Promise<{ success: boolean; data?: DpayDoctorBalanceReportExportRow[]; message?: string }> {
  await requireReport('dpay-doctor-balance');
  try {
    const result = await getDpayDoctorBalanceReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: DpayDoctorBalanceReportExportRow[] = result.data.map((r, i) => ({
      no: String(i + 1),
      status: r.status === 1 ? 'Active' : 'Inactive',
      doctorCode: r.doctorCode,
      doctorName: r.doctorName,
      speciality: r.speciality,
      doctorPhoneNo: r.doctorPhoneNo,
      accountCode: r.accountCode,
      doctorBalance: r.doctorBalance,
    }));

    const balanceTotal = result.data.reduce((sum, r) => sum + (Number(r.doctorBalance) || 0), 0);
    mapped.push({
      no: '',
      status: '',
      doctorCode: '',
      doctorName: 'Total',
      speciality: '',
      doctorPhoneNo: '',
      accountCode: '',
      doctorBalance: balanceTotal,
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.dpay-doctor-balance.exported',
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
