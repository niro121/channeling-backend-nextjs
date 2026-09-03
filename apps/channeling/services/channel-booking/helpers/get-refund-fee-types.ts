/**
 * Spec §6.4. Payment-aware split of session.fees.
 * Implementation lives in lib/booking-fees.ts so POS UI and server share one helper.
 */

export {
  getRefundFeeTypes,
  getApplicableFeeIds,
  hasCreditCardPayment,
  toBookingFeeContext,
  computeBookingBaseAmount,
  FEE_ID,
  type BookingFeeContext,
} from "@/lib/booking-fees"
