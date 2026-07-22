'use server';

import moment from 'moment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatCents } from '@/lib/format-money';
import { getCompletedHandoversReportService } from '@/services/reports/completed-handovers.report.service';
import type {
  CompletedHandoversReportExportRow,
  CompletedHandoversReportQuery,
} from '@/types/reports/completed-handovers';

export async function getCompletedHandoversReportData(query: CompletedHandoversReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getCompletedHandoversReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch completed handovers report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportCompletedHandoversReportData(
  query: CompletedHandoversReportQuery
): Promise<{ success: boolean; data?: CompletedHandoversReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getCompletedHandoversReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: CompletedHandoversReportExportRow[] = result.data.map((r, index) => ({
      no: String(index + 1),
      fromUser: r.fromUserName,
      toUser: r.toUserName,
      shiftStartedAt: r.shiftStartedAt ? moment(r.shiftStartedAt).format('YYYY-MM-DD HH:mm') : '-',
      cash: formatCents(r.cashCents),
      card: formatCents(r.cardCents),
      slip: formatCents(r.slipCents),
      cheque: formatCents(r.checkCents),
      credit: formatCents(r.creditCents),
      eWallet: formatCents(r.eWalletCents),
      total: formatCents(r.totalCents),
      status: r.statusLabel,
      createdAt: r.createdAt ? moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      completedAt: r.completedAt ? moment(r.completedAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      discrepancyReason: r.discrepancyReason?.trim() || '-',
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.completed-handovers.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          fromUserId: query.fromUserId ?? '__all__',
          toUserId: query.toUserId ?? '__all__',
          status: query.status ?? '__all__',
          count: mapped.length,
        },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}
