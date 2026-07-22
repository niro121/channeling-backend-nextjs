import {
  PAYMENT_METHOD_NAMES,
  RECEIPT_PAYMENT_METHOD,
  type ReceiptPaymentMethod,
} from '@archmage/shared';

export type PatientBillStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'closed' | 'cancelled';

export type PatientBillReceiptStatus = 'active' | 'cancelled' | 'refund';

/** Shared receipt payment codes used by DPAY (Agent + Mixed excluded). */
export type PatientBillPaymentMethod =
  | typeof RECEIPT_PAYMENT_METHOD.CASH
  | typeof RECEIPT_PAYMENT_METHOD.CREDIT_CARD
  | typeof RECEIPT_PAYMENT_METHOD.SLIP
  | typeof RECEIPT_PAYMENT_METHOD.CHECK
  | typeof RECEIPT_PAYMENT_METHOD.CREDIT
  | typeof RECEIPT_PAYMENT_METHOD.E_WALLET;

export const PATIENT_BILL_PAYMENT_METHODS: {
  value: PatientBillPaymentMethod;
  label: string;
}[] = (
  [
    RECEIPT_PAYMENT_METHOD.CASH,
    RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
    RECEIPT_PAYMENT_METHOD.SLIP,
    RECEIPT_PAYMENT_METHOD.CHECK,
    RECEIPT_PAYMENT_METHOD.CREDIT,
    RECEIPT_PAYMENT_METHOD.E_WALLET,
  ] as const
).map((value) => ({
  value,
  label: PAYMENT_METHOD_NAMES[value] ?? String(value),
}));

export const PATIENT_BILL_PAYMENT_METHOD_SET = new Set<number>(
  PATIENT_BILL_PAYMENT_METHODS.map((m) => m.value)
);

export function isPatientBillPaymentMethod(
  value: unknown
): value is PatientBillPaymentMethod {
  return typeof value === 'number' && PATIENT_BILL_PAYMENT_METHOD_SET.has(value);
}

export type { ReceiptPaymentMethod };

export type PatientBillReceipt = {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  /** Shared numeric code, or legacy string label on older rows. */
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
  outstandingAfter: number;
  paymentDate: string;
  status?: PatientBillReceiptStatus;
  cancelReceiptNumber?: string | null;
  refundOfReceiptId?: string | null;
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
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
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
  updatedAt: string;
  updatedByName?: string | null;
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
  updatedAt: string;
  updatedByName?: string | null;
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

export type BillLineItemStatus = 'active' | 'deleted';

export type BillLineItem = {
  id: string;
  doctorName: string;
  description: string;
  amount: number;
  status?: BillLineItemStatus;
  doctorPaymentId?: string | null;
  deletedAt?: string | null;
  deletedByName?: string | null;
};

export type AddPatientBillLineItemInput = {
  billId: string;
  doctorName: string;
  description: string;
  amount: number;
};

export type LineItemFormErrors = {
  doctorName?: string;
  description?: string;
  amount?: string;
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
  lineItems?: Record<string, LineItemFormErrors>;
};
