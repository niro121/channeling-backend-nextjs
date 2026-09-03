import { RECEIPT_PAYMENT_METHOD } from '@/types/receipt';
import type { CashierSummaryPaymentAmounts } from '@/types/report';

export const CASHIER_SUMMARY_ZERO_AMOUNTS: CashierSummaryPaymentAmounts = {
  cash: 0,
  creditCard: 0,
  slip: 0,
  cheque: 0,
  agent: 0,
  agentCredit: 0,
  eWallet: 0,
};

function paymentColumnKey(paymentMethod: number): keyof CashierSummaryPaymentAmounts {
  const map: Record<number, keyof CashierSummaryPaymentAmounts> = {
    [RECEIPT_PAYMENT_METHOD.CASH]: 'cash',
    [RECEIPT_PAYMENT_METHOD.CREDIT_CARD]: 'creditCard',
    [RECEIPT_PAYMENT_METHOD.SLIP]: 'slip',
    [RECEIPT_PAYMENT_METHOD.CHECK]: 'cheque',
    [RECEIPT_PAYMENT_METHOD.AGENT]: 'agent',
    [RECEIPT_PAYMENT_METHOD.CREDIT]: 'agentCredit',
    [RECEIPT_PAYMENT_METHOD.E_WALLET]: 'eWallet',
  };
  return map[paymentMethod] ?? 'cash';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Outflows (type 0) show as negative; inflows (type 1) as positive. Use Math.abs so refunds (stored negative) also display as minus. */
export function receiptToAmounts(
  paymentMethod: number,
  amount: number,
  type: number,
  paymentLines?: Array<{ paymentMethod: number; amount: number }>
): CashierSummaryPaymentAmounts {
  const sign = type === 0 ? -1 : 1;
  const result = { ...CASHIER_SUMMARY_ZERO_AMOUNTS };
  const normalizedLines =
    Array.isArray(paymentLines) && paymentLines.length > 0
      ? paymentLines
      : [{ paymentMethod, amount }];
  for (const line of normalizedLines) {
    const key = paymentColumnKey(line.paymentMethod);
    result[key] += sign * Math.abs(line.amount);
  }
  return result;
}

/**
 * Doctor payment (4) / doctor cancel (5): columns reflect net cash/till movement (gross − WHT), consistent with GL.
 */
export function receiptToAmountsDoctorPaymentNet(
  paymentMethod: number,
  amount: number,
  type: number,
  whd: number,
  paymentLines?: Array<{ paymentMethod: number; amount: number }>
): CashierSummaryPaymentAmounts {
  const whdRupees = Math.max(0, Number(whd) || 0);
  if (whdRupees <= 0) {
    return receiptToAmounts(paymentMethod, amount, type, paymentLines);
  }

  const sign = type === 0 ? -1 : 1;
  const result = { ...CASHIER_SUMMARY_ZERO_AMOUNTS };
  const normalizedLines =
    Array.isArray(paymentLines) && paymentLines.length > 0
      ? paymentLines
      : [{ paymentMethod, amount }];

  const totalAbs = normalizedLines.reduce((s, line) => s + Math.abs(line.amount), 0);
  if (totalAbs <= 0) {
    return receiptToAmounts(paymentMethod, amount, type, paymentLines);
  }

  const whdAllocated = Math.min(whdRupees, totalAbs);
  const netTotalAbs = totalAbs - whdAllocated;
  let allocatedNet = 0;

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i]!;
    const lineAbs = Math.abs(line.amount);
    const key = paymentColumnKey(line.paymentMethod);
    let lineNetAbs: number;
    if (i === normalizedLines.length - 1) {
      lineNetAbs = Math.max(0, round2(netTotalAbs - allocatedNet));
    } else {
      lineNetAbs = totalAbs > 0 ? (lineAbs / totalAbs) * netTotalAbs : 0;
      lineNetAbs = round2(lineNetAbs);
      allocatedNet += lineNetAbs;
    }
    result[key] += sign * lineNetAbs;
  }

  return result;
}

/**
 * Cashier summary Grand Total (rupees): credit (slip + customer credit) + cash methods.
 * Agent is listed separately on the report and is not included.
 */
export function cashierSummaryGrandTotalRupees(t: CashierSummaryPaymentAmounts): number {
  return (
    Number(t.cash) +
    Number(t.creditCard) +
    Number(t.slip) +
    Number(t.cheque) +
    Number(t.agentCredit) +
    Number(t.eWallet)
  )
}

export function cashierSummaryGrandTotalCents(t: CashierSummaryPaymentAmounts): number {
  return Math.round(cashierSummaryGrandTotalRupees(t) * 100)
}

export function addCashierSummaryAmounts(
  a: CashierSummaryPaymentAmounts,
  b: CashierSummaryPaymentAmounts
): CashierSummaryPaymentAmounts {
  return {
    cash: a.cash + b.cash,
    creditCard: a.creditCard + b.creditCard,
    slip: a.slip + b.slip,
    cheque: a.cheque + b.cheque,
    agent: a.agent + b.agent,
    agentCredit: a.agentCredit + b.agentCredit,
    eWallet: a.eWallet + b.eWallet,
  };
}
