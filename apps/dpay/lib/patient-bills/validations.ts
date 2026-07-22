import type {
  BillLineItem,
  LineItemFormErrors,
  PatientBillDraft,
  PatientBillFormErrors,
} from '@/types/patient-bill';
import { isLineItemFilled } from '@/lib/patient-bills/calculations';

export function clampAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
}

export function parseAmountInput(raw: string): number {
  if (raw.trim() === '') return 0;
  const parsed = Number(raw);
  return clampAmount(parsed);
}

/** Always two decimal places for amount inputs (e.g. 100.00). */
export function formatAmountFixed(amount: number): string {
  return clampAmount(amount).toFixed(2);
}

function validateLineItem(item: BillLineItem): LineItemFormErrors {
  const errors: LineItemFormErrors = {};

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

export function validateLineItemInput(input: {
  doctorName: string;
  description: string;
  amount: number;
}): LineItemFormErrors {
  return validateLineItem({
    id: 'new',
    doctorName: input.doctorName,
    description: input.description,
    amount: input.amount,
  });
}

export function hasLineItemErrors(errors: LineItemFormErrors): boolean {
  return Boolean(errors.doctorName || errors.description || errors.amount);
}

/**
 * Validates admission and customer fields only (edit bill page).
 */
export function validatePatientBillDetailsForm(
  draft: Pick<PatientBillDraft, 'admissionDate' | 'customerName'>
): PatientBillFormErrors {
  const errors: PatientBillFormErrors = {};

  if (!draft.admissionDate) {
    errors.admissionDate = 'Admission date is required';
  }

  if (!draft.customerName.trim()) {
    errors.customerName = 'Customer name is required';
  }

  return errors;
}

export function hasPatientBillDetailsErrors(errors: PatientBillFormErrors): boolean {
  return Boolean(errors.admissionDate || errors.customerName);
}

/**
 * Validates patient + admission. Doctor line items are optional (draft admission).
 * Any partially filled line item must still be complete.
 */
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
