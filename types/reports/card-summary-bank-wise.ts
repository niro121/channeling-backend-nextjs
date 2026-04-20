export type CardSummaryBankWiseReportFormat = 'summary' | 'detail';

export type CardSummaryBankWiseReportQuery = {
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateFrom: string;
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateTo: string;
  /** '__all__' or bank tag id */
  bankId?: string;
  /** '__all__' or location id */
  locationId?: string;
  /** summary or detail */
  format: CardSummaryBankWiseReportFormat;
};

export type CardSummaryBankWiseReportRow = {
  id: string;
  bankId: string | null;
  bankName: string | null;
  totalAmount: number;
  count: number;

  // detail-only fields
  receiptNoString?: string | null;
  createdAt?: Date | null;
  userLocation?: string | null;
  user?: string | null;
  cardReference?: string | null;
  remarks?: string | null;
};

export type CardSummaryBankWiseReportExportRow = {
  bank: string;
  total: string;
  count: string;
  receiptNo?: string;
  createdAt?: string;
  userLocation?: string;
  user?: string;
  cardReference?: string;
  remarks?: string;
};

