export type CashierDrawerBalanceReportQuery = {
  /** YYYY-MM-DD */
  date: string;
};

export type CashierDrawerBalanceReportRow = {
  tillAccountId: string;
  tillAccountName: string | null;
  tillAccountCode: string | null;

  cashierUserId: string | null;
  cashierName: string | null;
  cashierStaffCode: string | null;

  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  creditCents: number;
  eWalletCents: number;
  totalCents: number;
};

export type CashierDrawerBalanceReportExportRow = {
  till: string;
  cashier: string;
  cash: string;
  card: string;
  slip: string;
  check: string;
  credit: string;
  eWallet: string;
  total: string;
};

