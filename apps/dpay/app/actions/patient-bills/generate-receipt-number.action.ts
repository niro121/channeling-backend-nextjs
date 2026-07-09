'use server';

import { requirePermission } from '@/lib/server-permissions';
import { generateReceiptNumber } from '@/services/patient-bills/generate-receipt-number.service';

export async function generateReceiptNumberAction() {
  await requirePermission('patient-bills', 'edit');
  return generateReceiptNumber();
}
