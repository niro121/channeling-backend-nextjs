'use server';

import moment from 'moment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatCents } from '@/lib/format-money';
import type {
  CashBookReportExportRow,
  CashBookReportQuery,
  CashBookReportResponse,
} from '@/types/reports/cash-book';
import { getCashBookReportService } from '@/services/reports/cash-book.report.service';

export async function getCashBookReportData(query: CashBookReportQuery): Promise<CashBookReportResponse> {
  await requirePermission('reports', 'view');
  try {
    return await getCashBookReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch cash book report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      cashBookName: '-',
      cashBookCode: null,
      message: msg,
    };
  }
}

export async function exportCashBookReportData(
  query: CashBookReportQuery
): Promise<{ success: boolean; data?: CashBookReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getCashBookReportService(query);
    if (!result.success) {
      return { success: false, message: result.message ?? 'Failed to export cash book report' };
    }

    const mappedRows: CashBookReportExportRow[] = result.data.map((row) => ({
      date: new Date(row.date).toLocaleString(),
      journalNo: row.journalNumber != null ? String(row.journalNumber) : '-',
      account: row.accountLabel,
      description: row.description,
      paymentType: row.paymentMethodLabel,
      debit: row.debitAmount > 0 ? formatCents(row.debitAmount) : '-',
      credit: row.creditAmount > 0 ? formatCents(row.creditAmount) : '-',
      balance: formatCents(row.runningBalance),
    }));

    const exportData: CashBookReportExportRow[] = [
      {
        date: '',
        journalNo: '',
        account: '',
        description: 'Opening Balance',
        paymentType: '',
        debit: '',
        credit: '',
        balance: formatCents(result.openingBalanceCents),
      },
      ...mappedRows,
      {
        date: '',
        journalNo: '',
        account: '',
        description: 'Closing Balance',
        paymentType: '',
        debit: '',
        credit: '',
        balance: formatCents(result.closingBalanceCents),
      },
    ];

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.cash-book.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          cashBookAccountId: query.cashBookAccountId,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          count: mappedRows.length,
          exportedAt: moment().toISOString(),
        },
      });
    }

    return { success: true, data: exportData };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export cash book report';
    return { success: false, message: msg };
  }
}
