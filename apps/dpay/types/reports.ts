import type { DoctorPaymentMethod, DoctorPaymentStatus } from '@/types/doctor-payment';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';

export type ReportTab = 'receipts' | 'doctor-payments';

export type ReceiptReportRow = {
  id: string;
  receiptNumber: string;
  patientName: string;
  billId: string;
  billNumber: string;
  paymentDate: string;
  paymentMethod: PatientBillPaymentMethod;
  amountPaid: number;
};

export type ReceiptReportParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ReceiptReportResult = {
  data: ReceiptReportRow[];
  totalRecords: number;
  totalReceived: number;
};

export type ReceiptReportExportRow = {
  receiptNumber: string;
  patientName: string;
  billNumber: string;
  paymentDate: string;
  paymentMethod: string;
  amountPaid: string;
};

export type DoctorPaymentReportRow = {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  receiptNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: DoctorPaymentStatus;
  paymentMethod: DoctorPaymentMethod;
  createdAt: string;
};

export type DoctorPaymentReportParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DoctorPaymentReportResult = {
  data: DoctorPaymentReportRow[];
  totalRecords: number;
  totalPaid: number;
};

export type DoctorPaymentReportExportRow = {
  doctorName: string;
  receiptNumber: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
};
