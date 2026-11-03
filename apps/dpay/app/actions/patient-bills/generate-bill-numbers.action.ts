'use server';

import { requirePermission } from '@/lib/server-permissions';
import { generateBillNumbers } from '@/services/patient-bills/generate-bill-numbers.service';

export async function generateBillNumbersAction() {
  await requirePermission('patient-bills', 'add');
  return generateBillNumbers();
}
