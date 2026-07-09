import type { BillLineItem, PatientBillDraft, PatientBillFormErrors } from '@/types/patient-bill';
import { isLineItemFilled } from '@/lib/patient-bills/calculations';

export function clampAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function parseAmountInput(raw: string): number {
  if (raw.trim() === '') return 0;
  const parsed = Number(raw);
  return clampAmount(parsed);
}

function validateLineItem(item: BillLineItem): {
  doctorName?: string;
  description?: string;
  amount?: string;
} {
  const errors: { doctorName?: string; description?: string; amount?: string } = {};

  if (!item.doctorName.trim()) {
    errors.doctorName = 'Doctor name is required';
  }
  if (!item.description.trim()) {
    errors.description = 'Description is required';
  }
  if (item.amount < 0) {
    errors.amount = 'Amount cannot be negative';
  }

  return errors;
}

export function validatePatientBillForm(draft: PatientBillDraft): PatientBillFormErrors {
  const errors: PatientBillFormErrors = {};

  if (!draft.admissionDate) {
    errors.admissionDate = 'Admission date is required';
  }

  if (!draft.customerName.trim()) {
    errors.customerName = 'Customer name is required';
  }

  const lineItemErrors: Record<string, { doctorName?: string; description?: string; amount?: string }> =
    {};

  draft.lineItems.forEach((item) => {
    if (!isLineItemFilled(item)) return;
    const itemErrors = validateLineItem(item);
    if (Object.keys(itemErrors).length > 0) {
      lineItemErrors[item.id] = itemErrors;
    }
  });

  const hasFilledLine = draft.lineItems.some(isLineItemFilled);
  if (!hasFilledLine) {
    const firstItem = draft.lineItems[0];
    if (firstItem) {
      lineItemErrors[firstItem.id] = validateLineItem(firstItem);
    }
  }

  if (Object.keys(lineItemErrors).length > 0) {
    errors.lineItems = lineItemErrors;
  }

  return errors;
}

export function hasValidationErrors(errors: PatientBillFormErrors): boolean {
  if (errors.admissionDate || errors.customerName) return true;
  if (errors.lineItems && Object.keys(errors.lineItems).length > 0) return true;
  return false;
}
