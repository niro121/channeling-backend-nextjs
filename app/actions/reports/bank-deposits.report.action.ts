'use server';

import moment from 'moment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatReceiptAmount } from '@/lib/format-money';
import { getBankDepositsReportService } from '@/services/reports/bank-deposits.report.service';
import type { BankDepositsReportExportRow, BankDepositsReportQuery } from '@/types/reports/bank-deposits';

export async function getBankDepositsReportData(query: BankDepositsReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getBankDepositsReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch bank deposits report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportBankDepositsReportData(
  query: BankDepositsReportQuery
): Promise<{ success: boolean; data?: BankDepositsReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getBankDepositsReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: BankDepositsReportExportRow[] = result.data.map((r, index) => ({
      no: String(index + 1),
      transactionType: r.transactionType ?? '-',
      receiptNo: r.receiptNoString ?? '-',
      remarks: r.remarks ?? '-',
      userLocation: r.userLocation ?? '-',
      user: r.user ?? '-',
      createdAt: r.createdAt ? moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      bankAccount: r.bankAccountName ?? '-',
      total: formatReceiptAmount(r.totalAmount ?? 0),
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.bank-deposits.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          bankAccountId: query.bankAccountId ?? '__all__',
          userId: query.userId ?? '__all__',
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

