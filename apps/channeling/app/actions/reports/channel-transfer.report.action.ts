'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { getChannelTransferReportService } from '@/services/reports/channel-transfer.report.service';
import type {
  ChannelTransferReportExportRow,
  ChannelTransferReportQuery,
} from '@/types/reports/channel-transfer';

export async function getChannelTransferReportData(query: ChannelTransferReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getChannelTransferReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch channel transfer report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportChannelTransferReportData(
  query: ChannelTransferReportQuery
): Promise<{ success: boolean; data?: ChannelTransferReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelTransferReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: ChannelTransferReportExportRow[] = result.data.map((r) => {
      const meta = r.metadata ?? {};
      const newAppt = meta.newAppointmentNo ?? meta.newAppointmentNumber;
      return {
        transferredAt: moment(r.transferredAt).format('YYYY-MM-DD HH:mm:ss'),
        transferredBy: r.transferredByUserName ?? r.transferredByUserId ?? '-',
        bookingId: r.bookingDisplayId ?? r.bookingId ?? '-',
        receiptId: r.receiptNoString?.trim() ? r.receiptNoString : '-',
        beforeActivity: r.beforeActivity ?? '-',
        afterActivity: r.afterActivity ?? '-',
        remarks: r.remarks ?? '-',
        action: 'booking.transferred',
        fromSessionId: String(meta.fromSessionId ?? r.fromSessionId ?? '-'),
        toSessionId: String(meta.toSessionId ?? r.toSessionId ?? '-'),
        toDoctorId: String(meta.toDoctorId ?? r.toDoctorId ?? '-'),
        newAppointmentNo:
          newAppt != null && String(newAppt).trim() !== '' ? String(newAppt) : '-',
      };
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.channel-transfer.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mapped.length },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}

