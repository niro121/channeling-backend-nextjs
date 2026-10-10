'use server';

import moment from 'moment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireReport } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatReceiptAmount } from '@/lib/format-money';
import { getCashVouchersReportService } from '@/services/reports/cash-vouchers.report.service';
import type { CashVouchersReportExportRow, CashVouchersReportQuery } from '@/types/reports/cash-vouchers';

export async function getCashVouchersReportData(query: CashVouchersReportQuery) {
  await requireReport('cash-vouchers');
  try {
    return await getCashVouchersReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch cash vouchers report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportCashVouchersReportData(
  query: CashVouchersReportQuery
): Promise<{ success: boolean; data?: CashVouchersReportExportRow[]; message?: string }> {
  await requireReport('cash-vouchers');
  try {
    const result = await getCashVouchersReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }
    const mapped: CashVouchersReportExportRow[] = result.data.map((r, index) => ({
      no: String(index + 1),
      transactionType: r.transactionType || '-',
      receiptNo: r.receiptNoString || '-',
      remarks: r.remarks || '-',
      userLocation: r.userLocation || '-',
      user: r.user || '-',
      createdAt: r.createdAt ? moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      requestedBy: [r.requestedBy, r.requestedAt ? moment(r.requestedAt).format('YYYY-MM-DD HH:mm:ss') : null]
        .filter(Boolean)
        .join('\n') || '-',
      approvedBy: [r.approvedBy, r.approvedAt ? moment(r.approvedAt).format('YYYY-MM-DD HH:mm:ss') : null]
        .filter(Boolean)
        .join('\n') || '-',
      account: r.accountName || '-',
      convertedTypes: r.convertedTypes || '-',
      total: formatReceiptAmount(r.totalAmount ?? 0),
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.cash-vouchers.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          accountId: query.accountId ?? '__all__',
          userId: query.userId ?? '__all__',
          locationId: query.locationId ?? '__all__',
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
