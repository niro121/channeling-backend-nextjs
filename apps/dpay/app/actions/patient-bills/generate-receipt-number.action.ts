'use server';

import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { generateReceiptNumber } from '@/services/patient-bills/generate-receipt-number.service';

export async function generateReceiptNumberAction() {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  return generateReceiptNumber(session?.user?.id ?? null);
}
