export type CashVouchersReportQuery = {
  dateFrom: string;
  dateTo: string;
  /** '__all__' or reconciled Account.id */
  accountId?: string;
  /** '__all__' or User.id */
  userId?: string;
  /** '__all__' or Location.id */
  locationId?: string;
};

export type CashVouchersReportRow = {
  id: string;
  transactionType: string;
  receiptNoString: string;
  remarks: string;
  userLocation: string;
  user: string;
  createdAt: Date | null;
  requestedBy: string | null;
  requestedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  accountName: string;
  convertedTypes: string;
  totalAmount: number;
};

export type CashVouchersReportExportRow = {
  no: string;
  transactionType: string;
  receiptNo: string;
  remarks: string;
  userLocation: string;
  user: string;
  createdAt: string;
  requestedBy: string;
  approvedBy: string;
  account: string;
  convertedTypes: string;
  total: string;
};
