export type CashBookReportQuery = {
  dateFrom: string;
  dateTo: string;
  cashBookAccountId: string;
};

export type CashBookReportRow = {
  id: string;
  date: Date;
  journalNumber: number | null;
  accountLabel: string;
  description: string;
  paymentMethodLabel: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
};

export type CashBookReportResponse = {
  success: boolean;
  data: CashBookReportRow[];
  totalRecords: number;
  openingBalanceCents: number;
  closingBalanceCents: number;
  cashBookName: string;
  cashBookCode: string | null;
  message?: string;
};

export type CashBookReportExportRow = {
  date: string;
  journalNo: string;
  account: string;
  description: string;
  paymentType: string;
  debit: string;
  credit: string;
  balance: string;
};
