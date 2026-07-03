export type AgencyStatementQuery = {
  agencyId?: string; // required, __all__ not allowed
  dateFrom: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  dateTo: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
};

export type AgencyStatementRow = {
  no: number;
  date: Date;
  particulars: string;
  appointmentDateTime: string | null;
  receiptNo: string;
  docFee: number;
  hosFee: number;
  discount: number;
  amount: number;
  runningBalance: number;
  comments: string;
  createdBy: string;
};

export type AgencyStatementReportData = {
  agencyId: string;
  agencyName: string;
  agencyCode: string;
  accountLinked: boolean;
  accountName: string | null;
  openingBalance: number;
  closingBalance: number;
  rows: AgencyStatementRow[];
  message?: string;
};
