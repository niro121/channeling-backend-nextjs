'use server';

import { format } from 'date-fns';
import { requirePermission } from '@/lib/server-permissions';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import {
  getReceiptReport,
  getReceiptReportExport,
} from '@/services/reports/get-receipt-report.service';
import {
  getDoctorPaymentReport,
  getDoctorPaymentReportExport,
} from '@/services/reports/get-doctor-payment-report.service';
import type {
  DoctorPaymentReportExportRow,
  DoctorPaymentReportParams,
  ReceiptReportExportRow,
  ReceiptReportParams,
} from '@/types/reports';

export async function getReceiptReportAction(params: ReceiptReportParams = {}) {
  await requirePermission('reports', 'view');
  return getReceiptReport(params);
}

export async function getReceiptReportExportAction(
  params: Omit<ReceiptReportParams, 'page' | 'limit'>
): Promise<{ success: boolean; data?: ReceiptReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');

  try {
    const items = await getReceiptReportExport(params);
    const data: ReceiptReportExportRow[] = items.map((item) => ({
      receiptNumber: item.receiptNumber,
      patientName: item.patientName,
      billNumber: item.billNumber,
      paymentDate: format(new Date(item.paymentDate), 'yyyy-MM-dd'),
      paymentMethod: paymentMethodLabel(item.paymentMethod),
      amountPaid: formatLkr(item.amountPaid),
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to export receipt report',
    };
  }
}

export async function getDoctorPaymentReportAction(
  params: DoctorPaymentReportParams = {}
) {
  await requirePermission('reports', 'view');
  return getDoctorPaymentReport(params);
}

export async function getDoctorPaymentReportExportAction(
  params: Omit<DoctorPaymentReportParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: DoctorPaymentReportExportRow[];
  message?: string;
}> {
  await requirePermission('reports', 'view');

  try {
    const items = await getDoctorPaymentReportExport(params);
    const data: DoctorPaymentReportExportRow[] = items.map((item) => ({
      doctorName: item.doctorName,
      receiptNumber: item.receiptNumber,
      totalAmount: formatLkr(item.totalAmount),
      paidAmount: formatLkr(item.paidAmount),
      dueAmount: formatLkr(item.dueAmount),
      status:
        item.status === 'cancelled'
          ? 'Cancelled'
          : item.status === 'refund'
            ? 'Refund'
            : 'Paid',
      paymentMethod: paymentMethodLabel(item.paymentMethod),
      createdAt: format(new Date(item.createdAt), 'yyyy-MM-dd'),
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : 'Failed to export doctor payment report',
    };
  }
}
