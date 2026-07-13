import type { PatientBillStatus } from '@/types/patient-bill';

export function computeBillPaymentStatus(
  paidAmount: number,
  totalAmount: number
): PatientBillStatus {
  if (paidAmount <= 0) return 'pending';
  if (paidAmount >= totalAmount && totalAmount > 0) return 'paid';
  return 'partial';
}
