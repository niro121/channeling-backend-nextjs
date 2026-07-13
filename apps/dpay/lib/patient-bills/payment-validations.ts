import type { PatientBillPaymentMethod } from '@/types/patient-bill';

export type RecordPaymentFormErrors = {
  amountReceived?: string;
  paymentMethod?: string;
};

export function validateRecordPaymentForm(input: {
  amountReceived: string;
  paymentMethod: PatientBillPaymentMethod | '';
  outstandingAmount: number;
}): RecordPaymentFormErrors {
  const errors: RecordPaymentFormErrors = {};
  const amount = Number(input.amountReceived);

  if (!input.amountReceived.trim()) {
    errors.amountReceived = 'Amount received is required';
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amountReceived = 'Enter a valid amount greater than zero';
  } else if (amount > input.outstandingAmount) {
    errors.amountReceived = 'Amount cannot exceed the outstanding balance';
  }

  if (!input.paymentMethod) {
    errors.paymentMethod = 'Payment method is required';
  }

  return errors;
}

export function hasRecordPaymentErrors(errors: RecordPaymentFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
