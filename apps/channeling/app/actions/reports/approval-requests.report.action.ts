'use server';

import moment from 'moment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatReceiptAmount } from '@/lib/format-money';
import { getApprovalRequestsReportService } from '@/services/reports/approval-requests.report.service';
import type {
  ApprovalRequestsReportExportRow,
  ApprovalRequestsReportQuery,
} from '@/types/reports/approval-requests';

export async function getApprovalRequestsReportData(query: ApprovalRequestsReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getApprovalRequestsReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch approval requests report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

function dash(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s || '—';
}

export async function exportApprovalRequestsReportData(
  query: ApprovalRequestsReportQuery
): Promise<{ success: boolean; data?: ApprovalRequestsReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getApprovalRequestsReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: ApprovalRequestsReportExportRow[] = result.data.map((r, index) => ({
      no: String(index + 1),
      requestedAt: r.requestedAt ? moment(r.requestedAt).format('YYYY-MM-DD HH:mm:ss') : '—',
      type: r.typeLabel,
      channelType: dash(r.channelType),
      paymentMode: dash(r.paymentMode),
      details: [r.details, r.detailsSub].filter(Boolean).join(' — '),
      amount: formatReceiptAmount(r.amount ?? 0),
      requestedBy: dash(r.requestedByName),
      status: r.statusLabel,
      approvedBy: dash(r.approvedByName),
      approvedAt: r.approvedAt ? moment(r.approvedAt).format('YYYY-MM-DD HH:mm:ss') : '—',
      rejectedBy: dash(r.rejectedByName),
      rejectedAt: r.rejectedAt ? moment(r.rejectedAt).format('YYYY-MM-DD HH:mm:ss') : '—',
      withdrawnAt: r.withdrawnAt ? moment(r.withdrawnAt).format('YYYY-MM-DD HH:mm:ss') : '—',
      remarks: dash(r.remarks),
      rejectReason: dash(r.rejectReason),
    }));

    const totalAmount = result.data.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    mapped.push({
      no: '',
      requestedAt: 'Total',
      type: '',
      channelType: '',
      paymentMode: '',
      details: '',
      amount: formatReceiptAmount(totalAmount),
      requestedBy: '',
      status: '',
      approvedBy: '',
      approvedAt: '',
      rejectedBy: '',
      rejectedAt: '',
      withdrawnAt: '',
      remarks: '',
      rejectReason: '',
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.approval-requests.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          dateField: query.dateField ?? 'requested',
          type: query.type ?? '__all__',
          status: query.status ?? '__all__',
          requestedById: query.requestedById ?? '__all__',
          decidedById: query.decidedById ?? '__all__',
          count: result.data.length,
        },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}
