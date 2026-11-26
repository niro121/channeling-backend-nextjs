import { generateSeriesReceiptNumber } from '@/services/patient-bills/generate-receipt-number.service';

export type DoctorPaymentReceiptNumberResult = {
  receiptNumber: string;
  locationId: string;
  locationCode: string;
  locationName: string;
};

/**
 * Doctor payout receipts have their own series, separate from patient bill receipts:
 * `{Location.code}DPAY-DOC-PAY/########` — scope `{locationId}-doctorpaymentreceipts`.
 */
export async function generateDoctorPaymentReceiptNumber(
  userId: string | null | undefined
): Promise<DoctorPaymentReceiptNumberResult> {
  return generateSeriesReceiptNumber(userId, {
    scopeSuffix: 'doctorpaymentreceipts',
    prefixSuffix: 'DPAY-DOC-PAY/',
    sources: ['doctor'],
  });
}

/**
 * Doctor payout cancel / refund receipts have their own series, separate from patient bill refunds:
 * `{Location.code}DPAY-DOC-REF/########` — scope `{locationId}-doctorpaymentcancelreceipts`.
 */
export async function generateDoctorPaymentCancelReceiptNumber(
  userId: string | null | undefined
): Promise<DoctorPaymentReceiptNumberResult> {
  return generateSeriesReceiptNumber(userId, {
    scopeSuffix: 'doctorpaymentcancelreceipts',
    prefixSuffix: 'DPAY-DOC-REF/',
    sources: ['doctor'],
  });
}
