'use server';

import moment from 'moment';
import { requirePermission } from '@/lib/server-permissions';
import { getChannelReportReceiptWiseService } from '@/services/reports/channel-report-receipt-wise.report.service';
import type {
  ChannelReportReceiptWiseExportRow,
  ChannelReportReceiptWiseQuery,
  ChannelReportReceiptWiseRow,
} from '@/types/reports/channel-report-receipt-wise';

export async function getChannelReportReceiptWiseData(
  query: ChannelReportReceiptWiseQuery
): Promise<{
  success: boolean;
  data: ChannelReportReceiptWiseRow[];
  totalRecords: number;
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelReportReceiptWiseService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch channel report receipt-wise';
    return { success: false, data: [], totalRecords: 0, message };
  }
}

export async function exportChannelReportReceiptWiseData(
  query: ChannelReportReceiptWiseQuery
): Promise<{ success: boolean; data?: ChannelReportReceiptWiseExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelReportReceiptWiseService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const rows: ChannelReportReceiptWiseExportRow[] = result.data.map((row) => ({
      receiptNo: row.receiptNo,
      receiptScope: row.receiptScope,
      receiptDate: moment(row.receiptDate).format('YYYY-MM-DD hh:mm A'),
      receiptMethod: row.receiptMethod,
      transactionType: row.transactionType,
      receiptAmount: row.receiptAmount.toFixed(2),
      bookingNo: row.bookingNo,
      appointmentNo: row.appointmentNo,
      sessionDate: row.sessionDate ? moment(row.sessionDate).format('YYYY-MM-DD') : '-',
      sessionTime: row.sessionTime,
      consultant: row.consultant,
      patientName: row.patientName,
      bookingStatus: row.bookingStatus,
      agency: row.agency,
      creditCustomer: row.creditCustomer,
      creator: row.creator,
      handoverPerson: row.handoverPerson,
      cancelReason: row.cancelReason,
      reversedReceiptNo: row.reversedReceiptNo,
      whdAmount: row.whdAmount !== 0 ? row.whdAmount.toFixed(2) : '-',
      netAmount: row.netAmount.toFixed(2),
    }));

    return { success: true, data: rows };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to export channel report receipt-wise';
    return { success: false, message };
  }
}
