/** Shown when excess was already refunded (e.g. stale UI / concurrent attempt). */
export const OVERPAYMENT_ALREADY_REFUNDED_MESSAGE =
  'This overpayment has already been refunded.';

export function isOverpaymentRefundReceipt(receipt: {
  status?: string | null;
  remarks?: string | null;
  refundOfReceiptId?: string | null;
}): boolean {
  return (
    receipt.status === 'refund' &&
    !receipt.refundOfReceiptId &&
    (receipt.remarks?.startsWith('Overpayment refund') ?? false)
  );
}
