export type CashierShortBalanceReportQuery = {
  /** YYYY-MM-DDTHH:mm */
  asOfDateTime: string;
  /** '__all__' or location id */
  locationId?: string;
};

export type CashierShortBalanceReportRow = {
  accountId: string;
  accountName: string | null;
  accountCode: string | null;

  cashierUserId: string | null;
  cashierName: string | null;
  cashierStaffCode: string | null;

  locationId: string | null;
  locationName: string | null;
  locationCode: string | null;

  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  creditCents: number;
  eWalletCents: number;
  totalCents: number;
};

export type CashierShortBalanceReportExportRow = {
  account: string;
  cashier: string;
  branch: string;
  cash: string;
  card: string;
  slip: string;
  check: string;
  credit: string;
  eWallet: string;
  total: string;
};
