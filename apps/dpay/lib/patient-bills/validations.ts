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

/** Restrict amount typing to digits with at most one decimal point and two decimal places. */
export function sanitizeAmountDraftInput(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    const before = cleaned.slice(0, dotIndex + 1);
    const after = cleaned.slice(dotIndex + 1).replace(/\./g, '');
    cleaned = before + after;
  }

  const [whole = '', fraction = ''] = cleaned.split('.');
  if (fraction.length > 2) {
    return `${whole}.${fraction.slice(0, 2)}`;
  }
  return cleaned;
}

export function parseAmountInput(raw: string): number {
  const trimmed = sanitizeAmountDraftInput(raw.trim());
  if (trimmed === '' || trimmed === '.') return 0;

  const normalized = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  if (normalized === '') return 0;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
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

  const bhtNo = draft.bxtNumber.trim();
  if (!bhtNo) {
    errors.bxtNumber = 'BHT number is required';
  } else if (!/^[A-Za-z0-9/-]{3,30}$/.test(bhtNo)) {
    errors.bxtNumber = 'Use 3-30 letters, numbers, "/" or "-" only';
  }

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
  if (errors.bxtNumber || errors.admissionDate || errors.customerName) return true;
  if (errors.lineItems && Object.keys(errors.lineItems).length > 0) return true;
  return false;
}
