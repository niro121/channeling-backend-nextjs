'use server';

import { fetchServerSession } from '@/lib/session';
import { generateReceiptNumber } from '@/services/patient-bills/generate-receipt-number.service';

export async function generateReceiptNumberAction() {
  const session = await fetchServerSession();
  return generateReceiptNumber(session?.user?.id ?? null);
}
