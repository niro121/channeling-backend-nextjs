'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireReport } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { getDpayDoctorStatementReportService } from '@/services/reports/dpay-doctor-statement.report.service';
import type {
  DpayDoctorStatementExportRow,
  DpayDoctorStatementQuery,
} from '@/types/reports/dpay-doctor-statement';

export async function getDpayDoctorStatementReportData(query: DpayDoctorStatementQuery) {
  await requireReport('dpay-doctor-statement');
  try {
    const result = await getDpayDoctorStatementReportService(query);
    const session = await getServerSession(authOptions);
    if (session?.user?.id && result.success) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.dpay-doctor-statement.viewed',
        entityType: 'Report',
        importance: 'low',
        metadata: {
          doctorId: query.doctorId,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        },
      });
    }
    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch DPAY doctor statement';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportDpayDoctorStatementReportData(
  query: DpayDoctorStatementQuery
): Promise<{ success: boolean; data?: DpayDoctorStatementExportRow[]; message?: string }> {
  await requireReport('dpay-doctor-statement');
  try {
    const result = await getDpayDoctorStatementReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: DpayDoctorStatementExportRow[] = result.data.map((row) => ({
      date: row.date,
      particulars: row.particulars,
      debit: row.debit ?? '',
      credit: row.credit ?? '',
      balance: row.balance,
    }));

    const lines = result.data.filter((row) => row.kind === 'line');
    const debitTotal = lines.reduce((sum, row) => sum + (row.debit ?? 0), 0);
    const creditTotal = lines.reduce((sum, row) => sum + (row.credit ?? 0), 0);
    const closing = result.data[result.data.length - 1]?.balance ?? 0;
    mapped.push({
      date: '',
      particulars: 'Total',
      debit: debitTotal,
      credit: creditTotal,
      balance: closing,
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.dpay-doctor-statement.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          doctorId: query.doctorId,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          count: lines.length,
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
