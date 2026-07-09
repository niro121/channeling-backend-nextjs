import type { GeneratedBillNumbers } from '@/types/patient-bill';
import { getNextSequenceNumber } from '@/lib/patient-bills/sequence';

const BILL_SCOPE_KEY = 'patient-bill-bill';

function bxtScopeKey(year: number) {
  return `patient-bill-bxt-${year}`;
}

/**
 * Reserves the next bill numbers in the database sequence.
 * Called when opening the create form so displayed numbers match saved values.
 */
export async function generateBillNumbers(): Promise<GeneratedBillNumbers> {
  const year = new Date().getFullYear();

  const bxtResult = await getNextSequenceNumber(bxtScopeKey(year), { startFrom: 1 });
  if (!bxtResult.success) {
    throw new Error('Unable to generate BXT number');
  }

  const billResult = await getNextSequenceNumber(BILL_SCOPE_KEY, { startFrom: 1 });
  if (!billResult.success) {
    throw new Error('Unable to generate bill number');
  }

  return {
    bxtNumber: `BXT-${year}-${String(bxtResult.value).padStart(6, '0')}`,
    billNumber: `BILL-${String(billResult.value).padStart(6, '0')}`,
  };
}
