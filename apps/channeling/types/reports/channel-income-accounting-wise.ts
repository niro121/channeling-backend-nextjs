export type ChannelIncomeAccountingWiseQuery = {
  dateType?: 'transaction_date' | 'session_date';
  fromDateTime?: string;
  toDateTime?: string;
  locationId?: string;
  feeMode?: 'all' | 'hospital_fee_only' | 'professional_fee_only';
};

export type ChannelIncomeAccountingWiseRow = {
  key: string;
  bookingType: string;
  totalChannel: number;
  discount: number;
  cancel: number;
  refund: number;
  nettAmount: number;
};

export type ChannelIncomeAccountingWiseResult = {
  success: boolean;
  data?: ChannelIncomeAccountingWiseRow[];
  totals?: ChannelIncomeAccountingWiseRow;
  totalRecords?: number;
  message?: string;
};

export type ChannelIncomeAccountingWiseContentProps = {
  locationOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
};

export const CHANNEL_INCOME_DATE_TYPE_OPTIONS = [
  { id: 'transaction_date', name: 'Transaction Date' },
  { id: 'session_date', name: 'Session Date' },
] as const;

export const CHANNEL_INCOME_FEE_MODE_OPTIONS = [
  { id: 'hospital_fee_only', name: 'Hospital Fee Only' },
  { id: 'professional_fee_only', name: 'Professional Fee Only' },
  { id: 'all', name: 'All' },
] as const;

