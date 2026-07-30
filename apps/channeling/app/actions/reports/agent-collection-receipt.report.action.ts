'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import { getAgentCollectionReceiptReportService } from '@/services/reports/agent-collection-receipt.report.service';
import type {
  AgentCollectionReceiptReportExportRow,
  AgentCollectionReceiptReportQuery
} from '@/types/reports/agent-collection-receipt';

export async function getAgentCollectionReceiptReportData(query: AgentCollectionReceiptReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getAgentCollectionReceiptReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch agent collection receipts';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportAgentCollectionReceiptReportData(
  query: AgentCollectionReceiptReportQuery
): Promise<{ success: boolean; data?: AgentCollectionReceiptReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentCollectionReceiptReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: AgentCollectionReceiptReportExportRow[] = result.data.map((r) => ({
      date: moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      createdUser: r.createdUser ?? '-',
      receiptNo: r.receiptNoString ?? '-',
      remarks: r.remarks ?? '-',
      agencyName: r.agencyName ?? '-',
      agencyCode: r.agencyCode ?? '-',
      cancelReason: r.cancelReason ?? '-',
      receiptAmount: formatReceiptAmount(r.receiptAmount ?? 0),
      cash: formatReceiptAmount(r.cashAmount ?? 0),
      creditCard: formatReceiptAmount(r.cardAmount ?? 0),
      cheque: formatReceiptAmount(r.chequeAmount ?? 0),
      slip: formatReceiptAmount(r.slipAmount ?? 0),
      slipRef: r.slipRef ?? '-',
      slipDate: r.slipDate ?? '-',
      chequeRef: r.chequeRef ?? '-',
      chequeDate: r.chequeDate ?? '-',
      cardRef: r.cardRef ?? '-',
      bankName: r.bankName ?? '-',
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.agent-collection-receipt.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { ...query, count: mapped.length },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}

