import type { DoctorPaymentMethod, DoctorPaymentStatus } from '@/types/doctor-payment';
import type { PatientBillPaymentMethod, PatientBillReceiptStatus } from '@/types/patient-bill';

export type ReceiptReportRow = {
  id: string;
  receiptNumber: string;
  patientName: string;
  billId: string;
  billNumber: string;
  paymentDate: string;
  paymentMethod: PatientBillPaymentMethod | string;
  amountPaid: number;
  status: PatientBillReceiptStatus;
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
  status: string;
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

export type PatientDueReportRow = {
  id: string;
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
};

export type PatientDueReportParams = {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PatientDueReportResult = {
  data: PatientDueReportRow[];
  totalRecords: number;
  totalDue: number;
  hasMore: boolean;
};

export type PatientDueReportExportRow = {
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  status: string;
};

export type PatientExcessReportRow = {
  id: string;
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  totalAmount: number;
  paidAmount: number;
  excessAmount: number;
  status: string;
};

export type PatientExcessReportParams = {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PatientExcessReportResult = {
  data: PatientExcessReportRow[];
  totalRecords: number;
  totalExcess: number;
  hasMore: boolean;
};

export type PatientExcessReportExportRow = {
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  totalAmount: string;
  paidAmount: string;
  excessAmount: string;
  status: string;
};

export type DoctorDuePaymentReportRow = {
  id: string;
  doctorName: string;
  billId: string;
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  dueAmount: number;
  billStatus: string;
};

export type DoctorDuePaymentReportParams = {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DoctorDuePaymentReportResult = {
  data: DoctorDuePaymentReportRow[];
  totalRecords: number;
  totalDue: number;
  hasMore: boolean;
};

export type DoctorDuePaymentReportExportRow = {
  doctorName: string;
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  dueAmount: string;
  billStatus: string;
};
