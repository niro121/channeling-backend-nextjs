import { getNextSequenceNumber } from '@/lib/patient-bills/sequence';
import { getUserLocationConfig } from '@/lib/location';

function pad(num: number, size: number): string {
  return String(num).padStart(size, '0');
}

export type DoctorPaymentReceiptNumberResult = {
  receiptNumber: string;
  locationId: string;
  locationCode: string;
};

/**
 * `{Location.code}DPAY-DOC-PAY/########` — scoped to the cashier's branch.
 */
export async function generateDoctorPaymentReceiptNumber(
  userId: string | null | undefined
): Promise<DoctorPaymentReceiptNumberResult> {
  const location = await getUserLocationConfig(userId);
  if (!location.success) {
    throw new Error(location.message);
  }

  const { locationId, locationCode } = location.data;
  const scopeKey = `${locationId}-doctorpaymentreceipts`;
  const result = await getNextSequenceNumber(scopeKey, { startFrom: 1 });

  if (!result.success) {
    throw new Error('Unable to generate doctor payment receipt number');
  }

  return {
    receiptNumber: `${locationCode}DPAY-DOC-PAY/${pad(result.value, 8)}`,
    locationId,
    locationCode,
  };
}

/**
 * `{Location.code}DPAY-DOC-REF/########`
 */
export async function generateDoctorPaymentCancelReceiptNumber(
  userId: string | null | undefined
): Promise<DoctorPaymentReceiptNumberResult> {
  const location = await getUserLocationConfig(userId);
  if (!location.success) {
    throw new Error(location.message);
  }

  const { locationId, locationCode } = location.data;
  const scopeKey = `${locationId}-doctorpaymentcancelreceipts`;
  const result = await getNextSequenceNumber(scopeKey, { startFrom: 1 });

  if (!result.success) {
    throw new Error('Unable to generate doctor payment cancel receipt number');
  }

  return {
    receiptNumber: `${locationCode}DPAY-DOC-REF/${pad(result.value, 8)}`,
    locationId,
    locationCode,
  };
}
