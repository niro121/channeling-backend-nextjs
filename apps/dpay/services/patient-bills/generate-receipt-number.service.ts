import type { GeneratedReceiptNumber } from '@/types/patient-bill';
import { getNextSequenceNumber } from '@/lib/patient-bills/sequence';
import { getUserLocationConfig } from '@/lib/location';

function pad(num: number, size: number): string {
  return String(num).padStart(size, '0');
}

/**
 * Patient bill payment receipts — Channeling payment pattern with DPAY:
 * `{Location.code}DPAY/########`
 * Sequence scope: `{locationId}-paymentreceipts` (per user branch).
 */
export async function generateReceiptNumber(
  userId: string | null | undefined
): Promise<
  GeneratedReceiptNumber & {
    locationId: string;
    locationCode: string;
    locationName: string;
  }
> {
  const location = await getUserLocationConfig(userId);
  if (!location.success) {
    throw new Error(location.message);
  }

  const { locationId, locationCode, locationName } = location.data;
  const scopeKey = `${locationId}-paymentreceipts`;
  const result = await getNextSequenceNumber(scopeKey, { startFrom: 1 });

  if (!result.success) {
    throw new Error('Unable to generate receipt number');
  }

  return {
    receiptNumber: `${locationCode}DPAY/${pad(result.value, 8)}`,
    locationId,
    locationCode,
    locationName,
  };
}

/**
 * Payment cancel / refund receipts:
 * `{Location.code}DPAY-REF/########`
 * Sequence scope: `{locationId}-refundreceipts`
 */
export async function generateCancelReceiptNumber(
  userId: string | null | undefined
): Promise<
  GeneratedReceiptNumber & {
    locationId: string;
    locationCode: string;
    locationName: string;
  }
> {
  const location = await getUserLocationConfig(userId);
  if (!location.success) {
    throw new Error(location.message);
  }

  const { locationId, locationCode, locationName } = location.data;
  const scopeKey = `${locationId}-refundreceipts`;
  const result = await getNextSequenceNumber(scopeKey, { startFrom: 1 });

  if (!result.success) {
    throw new Error('Unable to generate cancel receipt number');
  }

  return {
    receiptNumber: `${locationCode}DPAY-REF/${pad(result.value, 8)}`,
    locationId,
    locationCode,
    locationName,
  };
}
