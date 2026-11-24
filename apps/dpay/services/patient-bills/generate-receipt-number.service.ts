import type { GeneratedReceiptNumber } from '@/types/patient-bill';
import prisma from '@/lib/prisma';
import {
  ensureSequenceAtLeast,
  getNextSequenceNumber,
} from '@/lib/patient-bills/sequence';
import { getUserLocationConfig } from '@/lib/location';

function pad(num: number, size: number): string {
  return String(num).padStart(size, '0');
}

function parseReceiptSuffix(receiptNumber: string, prefix: string): number {
  if (!receiptNumber.startsWith(prefix)) return 0;
  const suffix = receiptNumber.slice(prefix.length);
  const value = Number.parseInt(suffix, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Highest numeric suffix already used for a zero-padded receipt prefix.
 * String desc order is safe while suffixes stay fixed-width (########).
 */
async function maxExistingReceiptSuffix(
  prefix: string,
  sources: Array<'patient' | 'doctor'>
): Promise<number> {
  const queries: Promise<{ receiptNumber: string } | null>[] = [];

  if (sources.includes('patient')) {
    queries.push(
      prisma.patientBillReceipt.findFirst({
        where: { receiptNumber: { startsWith: prefix } },
        orderBy: { receiptNumber: 'desc' },
        select: { receiptNumber: true },
      })
    );
  }

  if (sources.includes('doctor')) {
    queries.push(
      prisma.doctorPayment.findFirst({
        where: { receiptNumber: { startsWith: prefix } },
        orderBy: { receiptNumber: 'desc' },
        select: { receiptNumber: true },
      })
    );
  }

  const rows = await Promise.all(queries);
  let max = 0;
  for (const row of rows) {
    if (!row) continue;
    const value = parseReceiptSuffix(row.receiptNumber, prefix);
    if (value > max) max = value;
  }
  return max;
}

/**
 * Keep the sequence counter at or above every existing receipt for this prefix,
 * then atomically reserve the next value. Prevents "receipt number was just used"
 * when Sequence lags behind stored receipts.
 */
async function reserveReceiptSequence(
  scopeKey: string,
  prefix: string,
  sources: Array<'patient' | 'doctor'>
): Promise<number> {
  const maxExisting = await maxExistingReceiptSuffix(prefix, sources);
  if (maxExisting > 0) {
    await ensureSequenceAtLeast(scopeKey, maxExisting);
  }

  const result = await getNextSequenceNumber(scopeKey, { startFrom: 1 });
  if (!result.success) {
    throw new Error('Unable to generate receipt number');
  }
  return result.value;
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
  const prefix = `${locationCode}DPAY/`;
  // Patient payments and doctor payouts share this format + sequence.
  const value = await reserveReceiptSequence(scopeKey, prefix, ['patient', 'doctor']);

  return {
    receiptNumber: `${prefix}${pad(value, 8)}`,
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
  const prefix = `${locationCode}DPAY-REF/`;
  const value = await reserveReceiptSequence(scopeKey, prefix, ['patient', 'doctor']);

  return {
    receiptNumber: `${prefix}${pad(value, 8)}`,
    locationId,
    locationCode,
    locationName,
  };
}

/**
 * Separate numbered series for a location (e.g. doctor payouts / doctor cancels):
 * `{Location.code}{prefixSuffix}########` with its own counter `{locationId}-{scopeSuffix}`.
 */
export async function generateSeriesReceiptNumber(
  userId: string | null | undefined,
  series: {
    scopeSuffix: string;
    prefixSuffix: string;
    sources: Array<'patient' | 'doctor'>;
  }
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
  const scopeKey = `${locationId}-${series.scopeSuffix}`;
  const prefix = `${locationCode}${series.prefixSuffix}`;
  const value = await reserveReceiptSequence(scopeKey, prefix, series.sources);

  return {
    receiptNumber: `${prefix}${pad(value, 8)}`,
    locationId,
    locationCode,
    locationName,
  };
}

/**
 * Overpayment refund receipts:
 * `{Location.code}DPAY-OVR/########`
 * Sequence scope: `{locationId}-overpaymentrefundreceipts`
 */
export async function generateOverpaymentRefundReceiptNumber(
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
  const scopeKey = `${locationId}-overpaymentrefundreceipts`;
  const prefix = `${locationCode}DPAY-OVR/`;
  const value = await reserveReceiptSequence(scopeKey, prefix, ['patient']);

  return {
    receiptNumber: `${prefix}${pad(value, 8)}`,
    locationId,
    locationCode,
    locationName,
  };
}
