'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChannelBookingsReportService } from '@/services/reports/channel-bookings.report.service';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  ChannelBookingsReportQuery,
  ChannelBookingsReportExportRow,
} from '@/types/reports/channel-bookings';

export async function getChannelBookingsReportData(query: ChannelBookingsReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelBookingsReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to fetch channel bookings report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportChannelBookingsReportData(
  query: ChannelBookingsReportQuery
): Promise<{
  success: boolean;
  data?: ChannelBookingsReportExportRow[];
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelBookingsReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }
    const STATUS_LABELS: Record<number, string> = {
      0: 'Pending',
      1: 'Paid',
      2: 'Cancel',
      3: 'Refund',
    };
    const REFUND_LABELS: Record<number, string> = {
      0: 'No Refund',
      1: 'Professional Only',
      2: 'Hospital Only',
      3: 'Full Refund',
    };
    const { PAYMENT_METHOD_NAMES } = await import('@/types/receipt');
    const { BOOKING_METHODS } = await import('@/types/channel-booking');

    const formatApplyTime = (session: { startTime?: Date; endTime?: Date } | null): string => {
      if (!session?.startTime || !session?.endTime) return '-';
      const s = new Date(session.startTime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const e = new Date(session.endTime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${s} - ${e}`;
    };
    const formatPatientName = (title?: string, name?: string) =>
      [title, name].filter(Boolean).join(' ').trim() || '-';

    const mapped: ChannelBookingsReportExportRow[] = result.data.map((row: any) => {
      const doctor = row.doctor;
      const session = row.session;
      const consultantCodeName = doctor ? `${doctor.code ?? ''} – ${doctor.name ?? ''}`.trim() : '-';
      const applyDate = session?.date
        ? new Date(session.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '-';
      const applyTime = formatApplyTime(session);
      const hasRefund = (row.refund ?? 0) !== 0;
      const refundedAt =
        hasRefund && row.refundReceiptCreatedAt
          ? new Date(row.refundReceiptCreatedAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : '-';
      const refundedBy =
        !hasRefund
          ? '-'
          : row.refundCreatedUser?.name
            ? row.refundCreatedUser.staff?.code
              ? `${row.refundCreatedUser.name} (${row.refundCreatedUser.staff.code})`
              : row.refundCreatedUser.name
            : '-';
      const formatUserWithStaff = (
        user: { name?: string | null; staff?: { code?: string | null } | null } | null | undefined,
        at: Date | string | null | undefined
      ) => {
        const n = user?.name;
        if (!n) return '-';
        const code = user?.staff?.code;
        const display = code ? `${n} (${code})` : n;
        const ts = at
          ? new Date(at).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : '';
        return `${display} (${ts})`;
      };
      const updater = formatUserWithStaff(row.updatedUser, row.updatedAt);
      const creator = formatUserWithStaff(row.createdUser, row.createdAt);

      return {
        consultantCodeName,
        speciality: doctor?.speciality?.name ?? '-',
        applyDate,
        applyTime,
        applyNumber: row.appointmentNo != null ? String(row.appointmentNo) : '-',
        billNumber: row.receiptNoString ?? row.bookingid_string ?? '-',
        method: BOOKING_METHODS.find((x: { id: number }) => x.id === row.method)?.name ?? '-',
        status: STATUS_LABELS[row.status] ?? String(row.status),
        refundStatus: REFUND_LABELS[row.refund] ?? '-',
        refundedAt,
        refundedBy,
        patientName: formatPatientName(row.title, row.name),
        patientNumber: row.phone ?? '-',
        area: row.area ?? '-',
        updater,
        creator,
        hospitalFee: typeof row.hospitalFee === 'number' ? row.hospitalFee.toFixed(2) : '-',
        doctorFee: typeof row.professionalFee === 'number' ? row.professionalFee.toFixed(2) : '-',
        discount: typeof row.discount === 'number' ? row.discount.toFixed(2) : '-',
        totalFee: typeof row.amount === 'number' ? row.amount.toFixed(2) : '-',
        paymentMode: row.receiptPaymentMethod != null ? (PAYMENT_METHOD_NAMES[row.receiptPaymentMethod] ?? String(row.receiptPaymentMethod)) : '-',
        agentName: row.agency?.name ?? '-',
      };
    });
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.channel-bookings.exported',
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
