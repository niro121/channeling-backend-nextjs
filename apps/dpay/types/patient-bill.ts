export type PatientBillStatus = 'pending' | 'partial' | 'paid' | 'closed';

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
};

export type RecordPatientBillPaymentInput = {
  billId: string;
  receiptNumber: string;
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
  createdAt: string;
  lineItems: BillLineItem[];
  receipts: PatientBillReceipt[];
};

export type GetPatientBillsParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  patientId?: string;
  status?: PatientBillStatus;
  date?: string;
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
