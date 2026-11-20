import type { BillLineItem, PatientBillDraft } from '@/types/patient-bill';

export function createEmptyLineItem(): BillLineItem {
  return {
    id: crypto.randomUUID(),
    doctorName: '',
    description: '',
    amount: 0,
  };
}

export function createInitialDraft(): PatientBillDraft {
  return {
    bxtNumber: '',
    billNumber: '',
    admissionDate: new Date().toISOString(),
    dischargeDate: null,
    customerName: '',
    customerNicPhone: '',
    customerAddress: '',
    lineItems: [createEmptyLineItem()],
  };
}
