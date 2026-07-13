export type DoctorPaymentStatus = 'paid' | 'cancelled';

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
];

/** Fixed WHT rate for doctor payouts (v1). */
export const DOCTOR_PAYMENT_WHT_PERCENTAGE = 5;

export type DoctorPaymentListItem = {
  id: string;
  receiptNo: string;
  status: DoctorPaymentStatus;
  doctorName: string;
  doctorSpecialty: string;
  doctorId: string;
  method: DoctorPaymentMethod;
  total: number;
  wht: number;
  net: number;
  remarks?: string | null;
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
};

export type GetDoctorPaymentsResult = {
  data: DoctorPaymentListItem[];
  totalRecords: number;
};

export type DoctorOption = {
  id: string;
  name: string;
};

export type EligibleDoctorBill = {
  /** Patient bill id — used as selection key */
  billId: string;
  billNumber: string;
  patientName: string;
  admissionDate: string;
  doctorName: string;
  doctorFee: number;
  discount: number;
  refund: number;
  payableAmount: number;
  lineItemIds: string[];
};

export type ProcessDoctorPaymentInput = {
  doctorName: string;
  billIds: string[];
  paymentMethod: DoctorPaymentMethod;
  applyWht: boolean;
  referenceNumber?: string;
  remarks?: string;
};

export type ProcessDoctorPaymentResult =
  | { success: true; receiptNumber: string; paymentId: string }
  | { success: false; message: string };

export type DoctorPaymentDetailBill = {
  billId: string;
  billNumber: string;
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
  paymentMethod: DoctorPaymentMethod;
  referenceNumber?: string | null;
  remarks?: string | null;
  cancelReason?: string | null;
  cancelReceiptNumber?: string | null;
  canceledAt?: string | null;
  totalAmount: number;
  whtAmount: number;
  whtPercentage: number;
  netAmount: number;
  applyWht: boolean;
  createdBy: string;
  createdAt: string;
  bills: DoctorPaymentDetailBill[];
};

export type CancelDoctorPaymentResult =
  | { success: true; cancelReceiptNumber: string }
  | { success: false; message: string };
