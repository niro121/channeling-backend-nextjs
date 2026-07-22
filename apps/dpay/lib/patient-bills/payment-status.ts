import type { PatientBillStatus } from '@/types/patient-bill';

/**
 * Derive bill status from amounts.
 * - draft: no doctor charges yet (admission-only)
 * - pending: charges exist, nothing paid
 * - partial / paid: based on paid vs total
 */
export function computeBillPaymentStatus(
  paidAmount: number,
  totalAmount: number
): PatientBillStatus {
  if (totalAmount <= 0 && paidAmount <= 0) return 'draft';
  if (paidAmount <= 0) return 'pending';
  if (paidAmount >= totalAmount && totalAmount > 0) return 'paid';
  return 'partial';
}
