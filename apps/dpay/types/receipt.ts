import type {
  PatientBillPaymentMethod,
  PatientBillReceiptStatus,
} from '@/types/patient-bill';

export type ReceiptListItem = {
  id: string;
  receiptNumber: string;
  billId: string;
  billNumber: string;
  bxtNumber: string;
  doctorName: string;
  paymentDate: string;
  paymentMethod: PatientBillPaymentMethod | string;
  referenceNumber?: string | null;
  bank?: string | null;
  bankId?: string | null;
  cardReference?: string | null;
  slipReference?: string | null;
  slipDate?: string | null;
  locationId?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
  remarks?: string | null;
  amountPaid: number;
  outstandingAfter: number;
  status: PatientBillReceiptStatus;
  cancelReceiptNumber?: string | null;
  refundOfReceiptId?: string | null;
  cancelReason?: string | null;
  canceledAt?: string | null;
  canceledByName?: string | null;
  createdByName?: string | null;
};

export type GetReceiptsParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  method?: string;
  status?: string;
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
  createdBy: string;
  status: string;
  cancelReason: string;
  canceledAt: string;
  canceledBy: string;
};
