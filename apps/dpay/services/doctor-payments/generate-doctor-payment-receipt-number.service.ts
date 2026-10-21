import {
  generateCancelReceiptNumber,
  generateReceiptNumber,
} from '@/services/patient-bills/generate-receipt-number.service';

export type DoctorPaymentReceiptNumberResult = {
  receiptNumber: string;
  locationId: string;
  locationCode: string;
  locationName: string;
};

/**
 * Doctor payout receipts use the same numbering as patient bill payments:
 * `{Location.code}DPAY/########` — scope `{locationId}-paymentreceipts`.
 */
export async function generateDoctorPaymentReceiptNumber(
  userId: string | null | undefined
): Promise<DoctorPaymentReceiptNumberResult> {
  return generateReceiptNumber(userId);
}

/**
 * Doctor payout cancel / refund receipts use the same numbering as patient bill refunds:
 * `{Location.code}DPAY-REF/########` — scope `{locationId}-refundreceipts`.
 */
export async function generateDoctorPaymentCancelReceiptNumber(
  userId: string | null | undefined
): Promise<DoctorPaymentReceiptNumberResult> {
  return generateCancelReceiptNumber(userId);
}
