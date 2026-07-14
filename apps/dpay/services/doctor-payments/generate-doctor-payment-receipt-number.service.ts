import { getNextSequenceNumber } from '@/lib/patient-bills/sequence';

const DOCTOR_PAYMENT_RECEIPT_SCOPE = 'doctor-payment-receipts';
const DOCTOR_PAYMENT_CANCEL_RECEIPT_SCOPE = 'doctor-payment-cancel-receipts';

function pad(num: number, size: number): string {
  return String(num).padStart(size, '0');
}

/**
 * Doctor payment receipt numbers (same pattern as channeling DOC-PAY):
 * DPAY-DOC-PAY/########
 */
export async function generateDoctorPaymentReceiptNumber(): Promise<string> {
  const result = await getNextSequenceNumber(DOCTOR_PAYMENT_RECEIPT_SCOPE, { startFrom: 1 });

  if (!result.success) {
    throw new Error('Unable to generate doctor payment receipt number');
  }

  return `DPAY-DOC-PAY/${pad(result.value, 8)}`;
}

/**
 * Doctor payment cancel / reversal receipt numbers (same pattern as channeling DOC-REF):
 * DPAY-DOC-REF/########
 */
export async function generateDoctorPaymentCancelReceiptNumber(): Promise<string> {
  const result = await getNextSequenceNumber(DOCTOR_PAYMENT_CANCEL_RECEIPT_SCOPE, {
    startFrom: 1,
  });

  if (!result.success) {
    throw new Error('Unable to generate doctor payment cancel receipt number');
  }

  return `DPAY-DOC-REF/${pad(result.value, 8)}`;
}
