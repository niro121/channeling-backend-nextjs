'use server';

import { generateBillNumbers } from '@/services/patient-bills/generate-bill-numbers.service';

export async function generateBillNumbersAction() {
  return generateBillNumbers();
}
