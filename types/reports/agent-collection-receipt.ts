export type AgentCollectionReceiptPaymentType = '__all__' | 'cash' | 'credit_card' | 'slip' | 'cheque' | 'e_wallet';

export type AgentCollectionReceiptReportQuery = {
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateFrom: string;
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateTo: string;
  /** '__all__' or location id */
  locationId?: string;
  /** '__all__' or agency id */
  agencyId?: string;
  /** '__all__' or payment type */
  paymentType?: AgentCollectionReceiptPaymentType;
};

export type AgentCollectionReceiptReportRow = {
  id: string;
  createdAt: Date;
  createdUser: string | null;
  receiptNoString: string | null;
  remarks: string | null;
  agencyName: string | null;
  agencyCode: string | null;
  cancelReason: string | null;
  receiptAmount: number;
  cashAmount: number;
  cardAmount: number;
  chequeAmount: number;
  slipAmount: number;
  slipRef: string | null;
  bankName: string | null;
};

export type AgentCollectionReceiptReportExportRow = {
  date: string;
  createdUser: string;
  receiptNo: string;
  remarks: string;
  agencyName: string;
  agencyCode: string;
  cancelReason: string;
  receiptAmount: string;
  cash: string;
  creditCard: string;
  cheque: string;
  slip: string;
  slipRef: string;
  bankName: string;
};

