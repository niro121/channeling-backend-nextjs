import type { GeneratedReceiptNumber } from '@/types/patient-bill';
import { getNextSequenceNumber } from '@/lib/patient-bills/sequence';

function receiptScopeKey(year: number) {
  return `patient-bill-receipt-${year}`;
}

/** Reserves the next receipt number: RCT-{year}-{6-digit}. */
export async function generateReceiptNumber(): Promise<GeneratedReceiptNumber> {
  const year = new Date().getFullYear();
  const result = await getNextSequenceNumber(receiptScopeKey(year), { startFrom: 1 });

  if (!result.success) {
    throw new Error('Unable to generate receipt number');
  }

  return {
    receiptNumber: `RCT-${year}-${String(result.value).padStart(6, '0')}`,
  };
}
