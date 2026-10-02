export type CompletedHandoversReportQuery = {
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateFrom: string;
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateTo: string;
  /** '__all__' or User.id — handed over by */
  fromUserId?: string;
  /** '__all__' or User.id — handed over to */
  toUserId?: string;
  /** '__all__' | 'pending' | 'approved' | 'rejected' */
  status?: string;
  /** '__all__' | 'pending' | 'in_reconciliation' | 'reconciled' | 'rejected' */
  reconciliationStatus?: string;
};

export type CompletedHandoversReportRow = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  shiftStartedAt: Date | null;
  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  creditCents: number;
  eWalletCents: number;
  totalCents: number;
  status: number;
  statusLabel: string;
  reconciliationStatus: number;
  reconciliationStatusLabel: string;
  createdAt: Date | null;
  completedAt: Date | null;
  discrepancyReason: string | null;
  cashierSummaryUrl: string | null;
};

export type CompletedHandoversReportExportRow = {
  no: string;
  fromUser: string;
  toUser: string;
  shiftStartedAt: string;
  cash: string;
  card: string;
  slip: string;
  cheque: string;
  credit: string;
  eWallet: string;
  total: string;
  status: string;
  reconciliationStatus: string;
  createdAt: string;
  completedAt: string;
  discrepancyReason: string;
};
