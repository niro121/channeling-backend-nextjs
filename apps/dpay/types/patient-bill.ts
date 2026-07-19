export type PatientBillStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'closed' | 'cancelled';

export type PatientBillReceiptStatus = 'active' | 'cancelled';

export type PatientBillPaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';

export const PATIENT_BILL_PAYMENT_METHODS: {
  value: PatientBillPaymentMethod;
  label: string;
}[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export type PatientBillReceipt = {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentMethod: PatientBillPaymentMethod;
  referenceNumber?: string | null;
  remarks?: string | null;
  outstandingAfter: number;
  paymentDate: string;
  status?: PatientBillReceiptStatus;
  cancelReason?: string | null;
  canceledAt?: string | null;
  canceledByName?: string | null;
  createdByName?: string | null;
};

export type RecordPatientBillPaymentInput = {
  billId: string;
  /** Optional — generated server-side on save when omitted. */
  receiptNumber?: string;
  amountReceived: number;
  paymentMethod: PatientBillPaymentMethod;
  referenceNumber?: string;
  remarks?: string;
};

export type GeneratedReceiptNumber = {
  receiptNumber: string;
};

export type PatientSummary = {
  id: string;
  name: string;
  doctorName: string;
};

export type PatientBill = {
  id: string;
  billNo: string;
  bxtNo?: string | null;
  patient: PatientSummary;
  admissionDate: string;
  dischargeDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PatientBillStatus;
  createdAt: string;
  createdByName?: string | null;
};

export type PatientBillDetail = {
  id: string;
  bxtNumber: string;
  billNumber: string;
  customerName: string;
  customerNicPhone?: string | null;
  customerAddress?: string | null;
  admissionDate: string;
  dischargeDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PatientBillStatus;
  cancelReason?: string | null;
  canceledAt?: string | null;
  canceledByName?: string | null;
  createdAt: string;
  createdByName?: string | null;
  lineItems: BillLineItem[];
  receipts: PatientBillReceipt[];
};

export type GetPatientBillsParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: PatientBillStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type GetPatientBillsResult = {
  data: PatientBill[];
  totalRecords: number;
};

export type BillLineItem = {
  id: string;
  doctorName: string;
  description: string;
  amount: number;
};

export type BillLineItemHistoryAction = 'created' | 'updated' | 'deleted';

export type BillLineItemHistoryEntry = {
  id: string;
  action: BillLineItemHistoryAction;
  changedAt: string;
  changedByName?: string | null;
  doctorName?: string | null;
  description?: string | null;
  amount?: number | null;
  sortOrder?: number | null;
  previousDoctorName?: string | null;
  previousDescription?: string | null;
  previousAmount?: number | null;
  previousSortOrder?: number | null;
};

export type GeneratedBillNumbers = {
  bxtNumber: string;
  billNumber: string;
};

export type PatientBillDraft = {
  bxtNumber: string;
  billNumber: string;
  admissionDate: string | null;
  dischargeDate: string | null;
  customerName: string;
  customerNicPhone: string;
  customerAddress: string;
  lineItems: BillLineItem[];
};

export type PatientBillSummary = {
  lineItemCount: number;
  doctorCount: number;
  subtotal: number;
  total: number;
};

export type PatientBillFormErrors = {
  admissionDate?: string;
  customerName?: string;
  lineItems?: Record<string, { doctorName?: string; description?: string; amount?: string }>;
};
