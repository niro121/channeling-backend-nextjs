'use server';

import moment from 'moment';
import { requirePermission } from '@/lib/server-permissions';
import { getChannelAgentReceiptReportService } from '@/services/reports/channel-agent-receipt.report.service';
import type {
  ChannelAgentReceiptReportExportRow,
  ChannelAgentReceiptReportQuery,
  ChannelAgentReceiptReportRow,
} from '@/types/reports/channel-agent-receipt';

export async function getChannelAgentReceiptReportData(
  query: ChannelAgentReceiptReportQuery
): Promise<{
  success: boolean;
  data: ChannelAgentReceiptReportRow[];
  totalRecords: number;
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelAgentReceiptReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch channel agent receipt report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportChannelAgentReceiptReportData(
  query: ChannelAgentReceiptReportQuery
): Promise<{ success: boolean; data?: ChannelAgentReceiptReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelAgentReceiptReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const data: ChannelAgentReceiptReportExportRow[] = result.data.map((row) => ({
      refNo: row.refNo,
      billNo: row.billNo,
      agency: row.agency,
      patient: row.patient,
      status: row.status,
      creator: row.creator,
      createdDate: moment(row.createdDate).format('YYYY-MM-DD hh:mm A'),
      billValue: row.billValue.toFixed(2),
    }));

    return { success: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export channel agent receipt report';
    return { success: false, message: msg };
  }
}
