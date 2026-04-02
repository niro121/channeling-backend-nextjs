export type CardSummaryBankWiseReportFormat = 'summary' | 'detail';

export type CardSummaryBankWiseReportQuery = {
  /** YYYY-MM-DD */
  dateFrom: string;
  /** YYYY-MM-DD */
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
  branch?: string | null;
  creator?: string | null;
  cardReference?: string | null;
  remarks?: string | null;
};

export type CardSummaryBankWiseReportExportRow = {
  bank: string;
  total: string;
  count: string;
  receiptNo?: string;
  createdAt?: string;
  branch?: string;
  creator?: string;
  cardReference?: string;
  remarks?: string;
};

