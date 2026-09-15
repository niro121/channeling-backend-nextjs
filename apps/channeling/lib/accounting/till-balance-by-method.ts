import { TILL_PAYMENT_METHOD } from '@/types/accounting';

/** Shape needed to read method-specific till balance (subset of TillBalanceBreakdown). */
export type TillBalanceBreakdownView = {
  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  eWalletCents: number;
};

/**
 * Get till balance (cents) for a specific payment method from breakdown.
 * Payment method: 0=cash, 1=card, 2=slip, 3=check, 6=e-wallet.
 */
export function getTillBalanceCentsByMethod(
  breakdown: TillBalanceBreakdownView,
  paymentMethod: number
): number {
  switch (paymentMethod) {
    case TILL_PAYMENT_METHOD.CASH:
      return breakdown.cashCents;
    case TILL_PAYMENT_METHOD.CREDIT_CARD:
      return breakdown.cardCents;
    case TILL_PAYMENT_METHOD.SLIP:
      return breakdown.slipCents;
    case TILL_PAYMENT_METHOD.CHECK:
      return breakdown.checkCents;
    case TILL_PAYMENT_METHOD.E_WALLET:
      return breakdown.eWalletCents;
    default:
      return breakdown.cashCents;
  }
}
