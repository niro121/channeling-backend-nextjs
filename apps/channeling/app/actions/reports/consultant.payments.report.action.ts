'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConsultantPaymentsReportService } from '@/services/reports/consultant.payments.report.service';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import type { ConsultantPaymentsReportQuery } from '@/types/report';

export type ConsultantPaymentsReportExportRow = {
  sNo: string;
  branch: string;
  consultant: string;
  consultantCode: string;
  paymentReceipt: string;
  channelReceipt: string;
  consultationSession: string;
  patientName: string;
  modeOfPay: string;
  consultationCharge: string;
  discountAmount: string;
  whtAmount: string;
  netAmount: string;
  paymentStatus: string;
  paidBy: string;
  paidDate: string;
  handedBy: string;
};

export async function getConsultantPaymentsReportData(query: ConsultantPaymentsReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getConsultantPaymentsReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch consultant payments report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}

export async function exportConsultantPaymentsReportData(
  query: ConsultantPaymentsReportQuery
): Promise<{ success: boolean; data?: ConsultantPaymentsReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getConsultantPaymentsReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }
    const mapped: ConsultantPaymentsReportExportRow[] = result.data.map((row: any) => {
      return {
        sNo: String(row.sNo ?? '-'),
        branch: row.branch ?? '-',
        consultant: row.consultant ?? '-',
        consultantCode: row.consultantCode ?? '-',
        paymentReceipt: row.paymentReceipt ?? '-',
        channelReceipt: row.channelReceipt ?? '-',
        consultationSession: row.consultationSession ?? '-',
        patientName: row.patientName ?? '-',
        modeOfPay: row.modeOfPay ?? '-',
        consultationCharge: String(row.consultationCharge ?? '0'),
        discountAmount: String(row.discountAmount ?? '0'),
        whtAmount: String(row.whtAmount ?? '0'),
        netAmount: String(row.netAmount ?? '0'),
        paymentStatus: row.paymentStatus ?? '-',
        paidBy: row.paidBy ?? '-',
        paidDate: row.paidDate ? moment(row.paidDate).format('DD/MM/YYYY HH:mm') : '-',
        handedBy: row.handedBy ?? '-',
      };
    });
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.consultant-payments.exported',
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
