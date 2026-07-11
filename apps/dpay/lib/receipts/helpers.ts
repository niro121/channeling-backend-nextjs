import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';

export function paymentMethodLabel(method: string) {
  return PATIENT_BILL_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

export function formatDoctorNames(
  lineItems: Array<{ doctorName: string; sortOrder: number }>
): string {
  const names = [...lineItems]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.doctorName.trim())
    .filter(Boolean);

  return [...new Set(names)].join(', ') || '—';
}
