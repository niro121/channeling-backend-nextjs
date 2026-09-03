'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import { getCardSummaryBankWiseReportService } from '@/services/reports/card-summary-bank-wise.report.service';
import type {
  CardSummaryBankWiseReportExportRow,
  CardSummaryBankWiseReportQuery
} from '@/types/reports/card-summary-bank-wise';

export async function getCardSummaryBankWiseReportData(query: CardSummaryBankWiseReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getCardSummaryBankWiseReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch card summary report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportCardSummaryBankWiseReportData(
  query: CardSummaryBankWiseReportQuery
): Promise<{ success: boolean; data?: CardSummaryBankWiseReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getCardSummaryBankWiseReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: CardSummaryBankWiseReportExportRow[] =
      query.format === 'summary'
        ? result.data.map((r) => ({
            bank: r.bankName ?? '-',
            total: formatReceiptAmount(r.totalAmount ?? 0),
            count: String(r.count ?? 0)
          }))
        : result.data.map((r) => ({
            bank: r.bankName ?? '-',
            total: formatReceiptAmount(r.totalAmount ?? 0),
            count: String(r.count ?? 0),
            receiptNo: r.receiptNoString ?? '-',
            createdAt: r.createdAt ? moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
            userLocation: r.userLocation ?? '-',
            user: r.user ?? '-',
            cardReference: r.cardReference ?? '-',
            remarks: r.remarks ?? '-'
          }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.card-summary-bank-wise.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          format: query.format,
          count: mapped.length,
          bankId: query.bankId ?? '__all__',
          locationId: query.locationId ?? '__all__'
        }
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}

