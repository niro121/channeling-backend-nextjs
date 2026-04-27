export type BankDepositsReportQuery = {
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateFrom: string;
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateTo: string;
  /** '__all__' or BankAccount.id */
  bankAccountId?: string;
  /** '__all__' or User.id */
  userId?: string;
  /** '__all__' or Location.id — branch where the receipt was recorded (matches User Location / Location on the receipt) */
  locationId?: string;
};

export type BankDepositsReportRow = {
  id: string;
  transactionType: string | null;
  receiptNoString: string | null;
  remarks: string | null;
  userLocation: string | null;
  user: string | null;
  createdAt: Date | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
  totalAmount: number;
  count: number;
};

export type BankDepositsReportExportRow = {
  no: string;
  transactionType: string;
  receiptNo: string;
  remarks: string;
  userLocation: string;
  user: string;
  createdAt: string;
  bankAccount: string;
  total: string;
};

