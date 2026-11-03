import type { CashierSummaryPaymentAmounts } from '@/types/report';
import type { DailyReturnsSummaryBucketKey } from '@/types/reports/daily-returns-summary';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Float total excludes Agent and Credit Customer payment methods (ledger/credit, not till float). */
export function dailyReturnsFloatTotal(amounts: CashierSummaryPaymentAmounts): number {
  return round2(
    amounts.cash + amounts.creditCard + amounts.slip + amounts.cheque + amounts.eWallet
  );
}

export function rowFromAmounts(
  key: DailyReturnsSummaryBucketKey,
  method: string,
  count: number,
  amounts: CashierSummaryPaymentAmounts
): {
  key: DailyReturnsSummaryBucketKey;
  method: string;
  count: number;
  cash: number;
  creditCard: number;
  slip: number;
  cheque: number;
  credit: number;
  eWallet: number;
  floatTotal: number;
  agent: number;
} {
  return {
    key,
    method,
    count,
    cash: round2(amounts.cash),
    creditCard: round2(amounts.creditCard),
    slip: round2(amounts.slip),
    cheque: round2(amounts.cheque),
    credit: round2(amounts.agentCredit),
    eWallet: round2(amounts.eWallet),
    floatTotal: dailyReturnsFloatTotal(amounts),
    agent: round2(amounts.agent),
  };
}
