'use server';

import { format } from 'date-fns';
import { requirePermission } from '@/lib/server-permissions';
import { formatLkr, formatReportLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import {
  getReceiptReport,
  getReceiptReportExport,
} from '@/services/reports/get-receipt-report.service';
import {
  getDoctorPaymentReport,
  getDoctorPaymentReportExport,
} from '@/services/reports/get-doctor-payment-report.service';
import {
  getPatientDueReport,
  getPatientDueReportExport,
} from '@/services/reports/get-patient-due-report.service';
import {
  getPatientExcessReport,
  getPatientExcessReportExport,
} from '@/services/reports/get-patient-excess-report.service';
import {
  getDoctorDuePaymentReport,
  getDoctorDuePaymentReportExport,
} from '@/services/reports/get-doctor-due-payment-report.service';
import type {
  DoctorPaymentReportExportRow,
  DoctorPaymentReportParams,
  DoctorDuePaymentReportExportRow,
  DoctorDuePaymentReportParams,
  PatientDueReportExportRow,
  PatientDueReportParams,
  PatientExcessReportExportRow,
  PatientExcessReportParams,
  ReceiptReportExportRow,
  ReceiptReportParams,
} from '@/types/reports';

function receiptStatusLabel(status: string): string {
  switch (status) {
    case 'cancelled':
      return 'Cancelled';
    case 'refund':
      return 'Refund';
    case 'active':
    default:
      return 'Active';
  }
}

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
      amountPaid: formatReportLkr(item.amountPaid, item.status === 'refund'),
      status: receiptStatusLabel(item.status),
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
      totalAmount: formatReportLkr(item.totalAmount, item.status === 'refund'),
      paidAmount: formatReportLkr(item.paidAmount, item.status === 'refund'),
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

function patientBillStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending':
      return 'Pending';
    case 'partial':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    case 'over_paid':
      return 'Over Paid';
    case 'closed':
      return 'Closed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export async function getPatientDueReportAction(params: PatientDueReportParams = {}) {
  await requirePermission('reports', 'view');
  return getPatientDueReport(params);
}

export async function getPatientDueReportExportAction(
  params: PatientDueReportParams = {}
): Promise<{ success: boolean; data?: PatientDueReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');

  try {
    const items = await getPatientDueReportExport(params);
    const data: PatientDueReportExportRow[] = items.map((item) => ({
      billNumber: item.billNumber,
      bxtNumber: item.bxtNumber,
      patientName: item.patientName,
      admissionDate: format(new Date(item.admissionDate), 'yyyy-MM-dd'),
      totalAmount: formatLkr(item.totalAmount),
      paidAmount: formatLkr(item.paidAmount),
      dueAmount: formatLkr(item.dueAmount),
      status: patientBillStatusLabel(item.status),
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to export patient due report',
    };
  }
}

export async function getPatientExcessReportAction(
  params: PatientExcessReportParams = {}
) {
  await requirePermission('reports', 'view');
  return getPatientExcessReport(params);
}

export async function getPatientExcessReportExportAction(
  params: PatientExcessReportParams = {}
): Promise<{
  success: boolean;
  data?: PatientExcessReportExportRow[];
  message?: string;
}> {
  await requirePermission('reports', 'view');

  try {
    const items = await getPatientExcessReportExport(params);
    const data: PatientExcessReportExportRow[] = items.map((item) => ({
      billNumber: item.billNumber,
      bxtNumber: item.bxtNumber,
      patientName: item.patientName,
      admissionDate: format(new Date(item.admissionDate), 'yyyy-MM-dd'),
      totalAmount: formatLkr(item.totalAmount),
      paidAmount: formatLkr(item.paidAmount),
      excessAmount: formatLkr(item.excessAmount),
      status: patientBillStatusLabel(item.status),
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : 'Failed to export patient excess report',
    };
  }
}

export async function getDoctorDuePaymentReportAction(
  params: DoctorDuePaymentReportParams = {}
) {
  await requirePermission('reports', 'view');
  return getDoctorDuePaymentReport(params);
}

export async function getDoctorDuePaymentReportExportAction(
  params: DoctorDuePaymentReportParams = {}
): Promise<{
  success: boolean;
  data?: DoctorDuePaymentReportExportRow[];
  message?: string;
}> {
  await requirePermission('reports', 'view');

  try {
    const items = await getDoctorDuePaymentReportExport(params);
    const data: DoctorDuePaymentReportExportRow[] = items.map((item) => ({
      doctorName: item.doctorName,
      billNumber: item.billNumber,
      bxtNumber: item.bxtNumber,
      patientName: item.patientName,
      admissionDate: format(new Date(item.admissionDate), 'yyyy-MM-dd'),
      dueAmount: formatLkr(item.dueAmount),
      billStatus: patientBillStatusLabel(item.billStatus),
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : 'Failed to export doctor due payment report',
    };
  }
}
