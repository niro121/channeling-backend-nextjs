'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { getDailyReturnsSummaryReportService } from '@/services/reports/daily-returns-summary.report.service';
import type {
  DailyReturnsSummaryReportExportRow,
  DailyReturnsSummaryReportQuery,
} from '@/types/reports/daily-returns-summary';

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function getDailyReturnsSummaryReportData(query: DailyReturnsSummaryReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getDailyReturnsSummaryReportService(query);
    const session = await getServerSession(authOptions);
    if (session?.user?.id && result.success) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.daily-returns-summary.viewed',
        entityType: 'Report',
        importance: 'low',
        metadata: {
          reportDate: query.reportDate,
          locationId: query.locationId ?? '__all__',
        },
      });
    }
    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch daily returns summary';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportDailyReturnsSummaryReportData(
  query: DailyReturnsSummaryReportQuery
): Promise<{ success: boolean; data?: DailyReturnsSummaryReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getDailyReturnsSummaryReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: DailyReturnsSummaryReportExportRow[] = result.data.map((r) => ({
      method: r.method,
      count: String(r.count),
      cash: money(r.cash),
      creditCard: money(r.creditCard),
      slip: money(r.slip),
      cheque: money(r.cheque),
      credit: money(r.credit),
      eWallet: money(r.eWallet),
      floatTotal: money(r.floatTotal),
      agent: money(r.agent),
    }));

    if (result.totals) {
      mapped.push({
        method: 'Sub Total',
        count: String(result.totals.count),
        cash: money(result.totals.cash),
        creditCard: money(result.totals.creditCard),
        slip: money(result.totals.slip),
        cheque: money(result.totals.cheque),
        credit: money(result.totals.agentCredit),
        eWallet: money(result.totals.eWallet),
        floatTotal: money(result.totals.floatTotal),
        agent: money(result.totals.agent),
      });
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.daily-returns-summary.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          reportDate: query.reportDate,
          locationId: query.locationId ?? '__all__',
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
