'use server';

import moment from 'moment';
import { requirePermission } from '@/lib/server-permissions';
import { getChannelDiscountReportService } from '@/services/reports/channel-discount.report.service';
import type {
  ChannelDiscountReportExportRow,
  ChannelDiscountReportQuery,
  ChannelDiscountReportResult
} from '@/types/reports/channel-discount-report';

function formatSession(date: Date | null, startUnix: number | null, endUnix: number | null): string {
  const datePart = date ? moment(date).format('DD-MM-YYYY') : '-';
  const start = startUnix != null ? moment.unix(startUnix).format('hh:mm A') : '-';
  const end = endUnix != null ? moment.unix(endUnix).format('hh:mm A') : '-';
  return `${datePart} ${start} - ${end}`;
}

export async function getChannelDiscountReportData(query: ChannelDiscountReportQuery): Promise<ChannelDiscountReportResult> {
  await requirePermission('reports', 'view');
  try {
    return await getChannelDiscountReportService(query);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch channel discount report';
    return { success: false, message };
  }
}

export async function exportChannelDiscountReportData(
  query: ChannelDiscountReportQuery
): Promise<{ success: boolean; data?: ChannelDiscountReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelDiscountReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const data: ChannelDiscountReportExportRow[] = result.data.map((row) => ({
      bookingDate: row.bookingDate ? moment(row.bookingDate).format('DD-MM-YYYY hh:mm A') : '-',
      session: formatSession(row.sessionDate, row.sessionStartTime, row.sessionEndTime),
      billNo: row.billNo ?? '-',
      patientName: row.patientName ?? '-',
      doctor: row.doctor ?? '-',
      type: row.type ?? '-',
      hospitalFee: String(row.hospitalFee ?? 0),
      hospitalFeeDiscount: String(row.hospitalFeeDiscount ?? 0),
      professionalFee: String(row.professionalFee ?? 0),
      professionalFeeDiscount: String(row.professionalFeeDiscount ?? 0),
      discount: String(row.discount ?? 0),
      autoDiscountScheme: row.autoDiscountScheme ?? '-',
      discountScheme: row.discountScheme ?? '-'
    }));

    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export channel discount report';
    return { success: false, message };
  }
}
