import { RECEIPT_METHOD } from '@/types/receipt';
import type { CashierSummaryPaymentAmounts } from '@/types/report';

export type DailyReturnsSummaryReportQuery = {
  /** YYYY-MM-DD */
  reportDate: string;
  /** '__all__' or location id */
  locationId?: string;
};

/** Receipt.method values included in this report (debit/credit notes excluded). */
export const DAILY_RETURNS_RECEIPT_METHODS = [
  RECEIPT_METHOD.PAYMENT,
  RECEIPT_METHOD.REFUND,
  RECEIPT_METHOD.DOCTOR_PAYMENT,
  RECEIPT_METHOD.DOCTOR_CANCEL,
  RECEIPT_METHOD.AGENCY_DEPOSIT,
  RECEIPT_METHOD.AGENCY_WITHDRAW,
  RECEIPT_METHOD.BRANCH_INCOME,
  RECEIPT_METHOD.BRANCH_EXPENSE,
  RECEIPT_METHOD.BANK_DEPOSIT,
  RECEIPT_METHOD.BANK_WITHDRAW,
] as const;

export type DailyReturnsSummaryBucketKey = (typeof DAILY_RETURNS_RECEIPT_METHODS)[number];

export type DailyReturnsSummaryReportRow = {
  /** Receipt.method */
  key: DailyReturnsSummaryBucketKey;
  /** Label from RECEIPT_METHOD_NAMES */
  method: string;
  count: number;
  cash: number;
  creditCard: number;
  slip: number;
  cheque: number;
  credit: number;
  eWallet: number;
  /** Cash + card + slip + cheque + e-wallet (excludes Agent and Credit Customer). */
  floatTotal: number;
  agent: number;
};

export type DailyReturnsSummaryReportExportRow = {
  method: string;
  count: string;
  cash: string;
  creditCard: string;
  slip: string;
  cheque: string;
  credit: string;
  eWallet: string;
  floatTotal: string;
  agent: string;
};

export type DailyReturnsSummaryTotals = CashierSummaryPaymentAmounts & {
  count: number;
  floatTotal: number;
};
