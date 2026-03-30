export type ChannelPatientCountAccountingWiseQuery = {
  dateType?: 'transaction_date' | 'session_date';
  fromDateTime?: string;
  toDateTime?: string;
  locationId?: string;
  feeMode?: 'all' | 'hospital_fee_only' | 'professional_fee_only';
};

export type ChannelPatientCountAccountingWiseRow = {
  key: string;
  bookingType: string;
  paidBillPaid: number;
  paidBillPending: number;
  paidBillNet: number;
  cancelBillPaid: number;
  cancelBillPending: number;
  cancelBillNet: number;
  refundBillHos: number;
  refundBillPro: number;
  totalCountPaid: number;
  totalCountPending: number;
  totalCountNet: number;
  paidRevenueHosFee: number;
  paidRevenueHosDis: number;
  paidRevenueProFee: number;
  paidRevenueProDis: number;
  paidRevenueTotal: number;
  cancelRevenueHosFee: number;
  cancelRevenueHosDis: number;
  cancelRevenueProFee: number;
  cancelRevenueProDis: number;
  cancelRevenueTotal: number;
  refundRevenueHosRefund: number;
  refundRevenueProRefund: number;
  nettRevenueHosFee: number;
  nettRevenueHosDis: number;
  nettRevenueProFee: number;
  nettRevenueProDis: number;
  nettRevenueTotal: number;
  pendingRevenueHosFee: number;
  pendingRevenueProFee: number;
};

export type ChannelPatientCountAccountingWiseResult = {
  success: boolean;
  data?: ChannelPatientCountAccountingWiseRow[];
  totals?: ChannelPatientCountAccountingWiseRow;
  totalRecords?: number;
  message?: string;
};

export type ChannelPatientCountAccountingWiseContentProps = {
  locationOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
};

export const CHANNEL_PATIENT_COUNT_DATE_TYPE_OPTIONS = [
  { id: 'transaction_date', name: 'Transaction Date' },
  { id: 'session_date', name: 'Session Date' },
] as const;

export const CHANNEL_PATIENT_COUNT_FEE_MODE_OPTIONS = [
  { id: 'all', name: 'All Fees' },
  { id: 'hospital_fee_only', name: 'Hospital Fee Only' },
  { id: 'professional_fee_only', name: 'Professional Fee Only' },
] as const;

