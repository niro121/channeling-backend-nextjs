/**
 * Format money for display: 2 decimal places and thousands separator (e.g. 10,000.00).
 * Use formatCents when the value is in smallest unit (cents); use formatLKR when already in rupees.
 */

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatLKR(lkr: number): string {
  return lkr.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format receipt amount for display. Receipt.amount is stored in rupees (as-is, not cents).
 * Display the value as-is (e.g. 21.90 → "21.90").
 */
export function formatReceiptAmount(amount: number): string {
  return formatLKR(Number(amount));
}

/**
 * Convert receipt amount (rupees, as-is) to cents for comparison with handover cardCents/slipCents etc.
 */
export function receiptAmountToCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/**
 * Signed cents for till/reconciliation.
 * type 1 = inflow, type 0 = outflow. Refunds store amount already negative, so use abs then apply type.
 */
export function signedReceiptAmountToCents(amount: number, type: number): number {
  const cents = receiptAmountToCents(Math.abs(amount));
  return type === 1 ? cents : -cents;
}

/** Display amount with a single minus for outflows/refunds (type 0), even if amount is already stored negative. */
export function formatSignedReceiptAmount(amount: number, type: number): string {
  const signed = type === 1 ? Math.abs(Number(amount)) : -Math.abs(Number(amount));
  return formatReceiptAmount(signed);
}
