import type { PatientBillPaymentMethod } from '@/types/patient-bill';

export type DoctorPaymentStatus = 'paid' | 'cancelled' | 'refund';

export type DoctorPaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'cheque'
  | 'online_transfer'
  | 'other';

export const DOCTOR_PAYMENT_METHODS: {
  value: DoctorPaymentMethod;
  label: string;
}[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online_transfer', label: 'Online Transfer' },
  { value: 'other', label: 'Other' },
];

export const DOCTOR_PAYMENT_STATUSES: {
  value: DoctorPaymentStatus;
  label: string;
}[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refund', label: 'Refund' },
];

export const DOCTOR_PAYMENT_METHOD_SET = new Set<string>(
  DOCTOR_PAYMENT_METHODS.map((m) => m.value)
);

export function isDoctorPaymentMethod(value: unknown): value is DoctorPaymentMethod {
  return typeof value === 'string' && DOCTOR_PAYMENT_METHOD_SET.has(value);
}

export function doctorPaymentNeedsReference(method: DoctorPaymentMethod): boolean {
  return (
    method === 'bank_transfer' || method === 'cheque' || method === 'online_transfer'
  );
}

export type DoctorPaymentListItem = {
  id: string;
  receiptNo: string;
  status: DoctorPaymentStatus;
  doctorName: string;
  doctorSpecialty: string;
  doctorId: string;
  method: string;
  total: number;
  net: number;
  remarks?: string | null;
  handedToStaff?: string | null;
  cancelReason?: string | null;
  createdBy: string;
  createdAt: string;
};

export type GetDoctorPaymentsParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  method?: string;
  doctorName?: string;
  status?: string;
  /** `YYYY-MM-DD`, filters on created date (inclusive). */
  dateFrom?: string;
  dateTo?: string;
};

export type GetDoctorPaymentsResult = {
  data: DoctorPaymentListItem[];
  totalRecords: number;
};

export type DoctorOption = {
  id: string;
  name: string;
};

export type StaffOption = {
  id: string;
  name: string;
};

export type EligibleDoctorBill = {
  /** Patient bill line item id — unique selection key (one row per unpaid line). */
  lineItemId: string;
  /** Parent patient bill id. */
  billId: string;
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  /** Patient bill payment status (pending / partial / paid / over_paid). */
  billStatus: 'pending' | 'partial' | 'paid' | 'over_paid';
  doctorName: string;
  description: string;
  doctorFee: number;
  discount: number;
  refund: number;
  payableAmount: number;
  /** Always a single id matching lineItemId; kept for payment-item persistence. */
  lineItemIds: string[];
};

export type ProcessDoctorPaymentInput = {
  doctorName: string;
  /** Unpaid patient-bill line item ids to include in this payout. */
  lineItemIds: string[];
  /** Same receipt payment codes as patient bill record payment. */
  paymentMethod: PatientBillPaymentMethod;
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
  remarks?: string;
  /** Display label of the staff member the payment was handed to. */
  handedToStaff?: string;
};

export type ProcessDoctorPaymentResult =
  | { success: true; receiptNumber: string; paymentId: string }
  | { success: false; message: string };

export type DoctorPaymentDetailBill = {
  billId: string;
  billNumber: string;
  bxtNumber: string;
  patientName: string;
  admissionDate: string;
  doctorFee: number;
  discount: number;
  refund: number;
  payableAmount: number;
};

export type DoctorPaymentDetail = {
  id: string;
  receiptNumber: string;
  status: DoctorPaymentStatus;
  doctorName: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  bank?: string | null;
  bankId?: string | null;
  cardReference?: string | null;
  slipReference?: string | null;
  slipDate?: string | null;
  remarks?: string | null;
  handedToStaff?: string | null;
  cancelReason?: string | null;
  cancelReceiptNumber?: string | null;
  refundOfPaymentId?: string | null;
  canceledAt?: string | null;
  locationId?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
  totalAmount: number;
  netAmount: number;
  createdBy: string;
  createdAt: string;
  bills: DoctorPaymentDetailBill[];
};

export type CancelDoctorPaymentInput = {
  paymentId: string;
  cancelReason: string;
  /** Receipt-style refund method (same as patient bill receipt cancel). */
  refundPaymentMethod: PatientBillPaymentMethod;
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
  canceledBy: string | null;
  canceledByName: string | null;
};

export type CancelDoctorPaymentResult =
  | { success: true; cancelReceiptNumber: string }
  | { success: false; message: string };

/** One row of the doctor payments Excel export (same filters as the list, no paging). */
export type DoctorPaymentExportRow = {
  receiptNumber: string;
  status: string;
  doctorName: string;
  paymentMethod: string;
  total: number;
  net: number;
  createdBy: string;
  createdAt: string;
  handedToStaff: string;
};
