import type { BillLineItem, GeneratedBillNumbers, PatientBillDraft } from '@/types/patient-bill';

export function createEmptyLineItem(): BillLineItem {
  return {
    id: crypto.randomUUID(),
    doctorName: '',
    description: '',
    amount: 0,
  };
}

export function createInitialDraft(numbers: GeneratedBillNumbers): PatientBillDraft {
  return {
    bxtNumber: numbers.bxtNumber,
    billNumber: numbers.billNumber,
    admissionDate: null,
    dischargeDate: null,
    customerName: '',
    customerNicPhone: '',
    customerAddress: '',
    lineItems: [createEmptyLineItem()],
  };
}
