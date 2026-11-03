import type { GeneratedBillNumbers } from '@/types/patient-bill';
import { getNextSequenceNumber } from '@/lib/patient-bills/sequence';

const BILL_SCOPE_KEY = 'patient-bill-bill';

function bhtScopeKey(year: number) {
  // Keep legacy scope key so numbering continues from historical BXT counters.
  return `patient-bill-bxt-${year}`;
}

/**
 * Reserves the next BHT + Bill numbers.
 * Call this at save time so concurrent create-page opens do not burn numbers.
 * Each counter uses an atomic $inc, so concurrent callers never share a value.
 */
export async function generateBillNumbers(): Promise<GeneratedBillNumbers> {
  const year = new Date().getFullYear();

  const bhtResult = await getNextSequenceNumber(bhtScopeKey(year), { startFrom: 1 });
  if (!bhtResult.success) {
    throw new Error('Unable to generate BHT number');
  }

  const billResult = await getNextSequenceNumber(BILL_SCOPE_KEY, { startFrom: 1 });
  if (!billResult.success) {
    throw new Error('Unable to generate bill number');
  }

  return {
    bxtNumber: `BHT-${year}-${String(bhtResult.value).padStart(6, '0')}`,
    billNumber: `BILL-${String(billResult.value).padStart(6, '0')}`,
  };
}
