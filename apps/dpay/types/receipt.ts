import type { PatientBillPaymentMethod } from '@/types/patient-bill';

export type ReceiptListItem = {
  id: string;
  receiptNumber: string;
  billId: string;
  billNumber: string;
  bxtNumber: string;
  doctorName: string;
  paymentDate: string;
  paymentMethod: PatientBillPaymentMethod;
  referenceNumber?: string | null;
  remarks?: string | null;
  amountPaid: number;
  outstandingAfter: number;
};

export type GetReceiptsParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type GetReceiptsResult = {
  data: ReceiptListItem[];
  totalRecords: number;
};

export type ReceiptExportRow = {
  receiptNumber: string;
  billNumber: string;
  doctorName: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  amountPaid: string;
};
