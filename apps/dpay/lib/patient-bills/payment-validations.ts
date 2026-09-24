import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import {
  isPatientBillPaymentMethod,
  type PatientBillPaymentMethod,
} from '@/types/patient-bill';

export type RecordPaymentFormErrors = {
  amountReceived?: string;
  paymentMethod?: string;
  bank?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
};

export type PaymentMethodFieldsInput = {
  paymentMethod: PatientBillPaymentMethod | '';
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
};

export type RecordPaymentFormInput = PaymentMethodFieldsInput & {
  amountReceived: string;
  outstandingAmount: number;
};

/** Shared method + bank/ref rules for record payment and refunds. */
export function validatePaymentMethodFields(
  input: PaymentMethodFieldsInput
): RecordPaymentFormErrors {
  const errors: RecordPaymentFormErrors = {};

  if (input.paymentMethod === '' || !isPatientBillPaymentMethod(input.paymentMethod)) {
    errors.paymentMethod = 'Payment method is required';
    return errors;
  }

  const method = input.paymentMethod;
  const bank = input.bank?.trim() ?? '';
  const cardReference = (input.cardReference ?? '').replace(/\D/g, '');
  const slipReference = input.slipReference?.trim() ?? '';
  const slipDate = input.slipDate?.trim() ?? '';

  if (method === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
    if (!bank) errors.bank = 'Bank is required';
    if (cardReference.length !== 4) {
      errors.cardReference = 'Enter last 4 digits of the card';
    }
  }

  if (method === RECEIPT_PAYMENT_METHOD.SLIP) {
    if (!bank) errors.bank = 'Bank is required';
    if (!slipReference) errors.slipReference = 'Slip reference is required';
    if (!slipDate) errors.slipDate = 'Slip date is required';
  }

  if (method === RECEIPT_PAYMENT_METHOD.CHECK) {
    if (!bank) errors.bank = 'Bank is required';
    if (!slipReference) errors.slipReference = 'Cheque number is required';
    if (!slipDate) errors.slipDate = 'Cheque date is required';
  }

  if (method === RECEIPT_PAYMENT_METHOD.E_WALLET) {
    if (!(input.cardReference?.trim() ?? '')) {
      errors.cardReference = 'E-wallet reference is required';
    }
  }

  return errors;
}

export function buildPaymentMethodMeta(input: {
  paymentMethod: PatientBillPaymentMethod;
  bank?: string | null;
  bankId?: string | null;
  cardReference?: string | null;
  slipReference?: string | null;
  slipDate?: string | null;
}) {
  const method = input.paymentMethod;
  const bank = input.bank?.trim() || null;
  const bankId = input.bankId?.trim() || null;
  const cardReferenceRaw = input.cardReference?.trim() || null;
  const slipReference = input.slipReference?.trim() || null;
  const slipDate = parsePaymentSlipDate(input.slipDate);

  if (method === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
    return {
      bank,
      bankId,
      cardReference: (cardReferenceRaw ?? '').replace(/\D/g, '').slice(0, 4) || null,
      slipReference: null as string | null,
      slipDate: null as Date | null,
      referenceNumber: null as string | null,
    };
  }

  if (method === RECEIPT_PAYMENT_METHOD.SLIP || method === RECEIPT_PAYMENT_METHOD.CHECK) {
    return {
      bank,
      bankId,
      cardReference: null as string | null,
      slipReference,
      slipDate,
      referenceNumber: null as string | null,
    };
  }

  if (method === RECEIPT_PAYMENT_METHOD.E_WALLET) {
    return {
      bank: null as string | null,
      bankId: null as string | null,
      cardReference: cardReferenceRaw,
      slipReference: null as string | null,
      slipDate: null as Date | null,
      referenceNumber: null as string | null,
    };
  }

  return {
    bank: null as string | null,
    bankId: null as string | null,
    cardReference: null as string | null,
    slipReference: null as string | null,
    slipDate: null as Date | null,
    referenceNumber: null as string | null,
  };
}

/** Server-side method meta check (record payment + refund). */
export function validatePaymentMethodMetaMessage(
  input: PaymentMethodFieldsInput
): string | null {
  if (!isPatientBillPaymentMethod(input.paymentMethod)) {
    return 'Invalid payment method';
  }

  const method = input.paymentMethod;
  const bank = input.bank?.trim() ?? '';
  const cardDigits = (input.cardReference ?? '').replace(/\D/g, '');
  const slipReference = input.slipReference?.trim() ?? '';
  const slipDate = input.slipDate?.trim() ?? '';

  if (method === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
    if (!bank) return 'Bank is required for credit card payments';
    if (cardDigits.length !== 4) return 'Enter last 4 digits of the card';
  }

  if (method === RECEIPT_PAYMENT_METHOD.SLIP) {
    if (!bank) return 'Bank is required for slip payments';
    if (!slipReference) return 'Slip reference is required';
    if (!slipDate || !parsePaymentSlipDate(slipDate)) {
      return 'Slip date is required';
    }
  }

  if (method === RECEIPT_PAYMENT_METHOD.CHECK) {
    if (!bank) return 'Bank is required for cheque payments';
    if (!slipReference) return 'Cheque number is required';
    if (!slipDate || !parsePaymentSlipDate(slipDate)) {
      return 'Cheque date is required';
    }
  }

  if (method === RECEIPT_PAYMENT_METHOD.E_WALLET) {
    if (!input.cardReference?.trim()) {
      return 'E-wallet reference is required';
    }
  }

  return null;
}

export function validateRecordPaymentForm(
  input: RecordPaymentFormInput
): RecordPaymentFormErrors {
  const errors: RecordPaymentFormErrors = {
    ...validatePaymentMethodFields(input),
  };
  const amount = Number(input.amountReceived);

  if (!input.amountReceived.trim()) {
    errors.amountReceived = 'Amount received is required';
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amountReceived = 'Enter a valid amount greater than zero';
  }

  return errors;
}

export function hasRecordPaymentErrors(errors: RecordPaymentFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Parse YYYY-MM-DD (or ISO) into a Date at local noon to avoid timezone day shifts. */
export function parsePaymentSlipDate(value?: string | null): Date | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
