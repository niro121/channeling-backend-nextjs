'use client';

import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import type { RecordPaymentFormErrors } from '@/lib/patient-bills/payment-validations';
import {
  emptyPaymentMethodValues,
  PaymentMethodFields,
  type PaymentMethodValues,
} from './payment-method-fields';

export type RefundMethodValues = {
  refundPaymentMethod: PatientBillPaymentMethod;
  bank: string;
  bankId: string;
  cardReference: string;
  slipReference: string;
  slipDate: string;
};

type RefundMethodFieldsProps = {
  value: RefundMethodValues;
  onChange: (next: RefundMethodValues) => void;
  errors?: RecordPaymentFormErrors;
  disabled?: boolean;
  /** Restrict selectable refund methods (e.g. cash-only / original-or-cash). */
  allowedMethods?: PatientBillPaymentMethod[];
  onBanksError?: (message: string) => void;
};

export function emptyRefundMethodValues(
  method: PatientBillPaymentMethod = RECEIPT_PAYMENT_METHOD.CASH
): RefundMethodValues {
  const base = emptyPaymentMethodValues(method);
  return {
    refundPaymentMethod: base.paymentMethod,
    bank: base.bank,
    bankId: base.bankId,
    cardReference: base.cardReference,
    slipReference: base.slipReference,
    slipDate: base.slipDate,
  };
}

function toPaymentValues(value: RefundMethodValues): PaymentMethodValues {
  return {
    paymentMethod: value.refundPaymentMethod,
    bank: value.bank,
    bankId: value.bankId,
    cardReference: value.cardReference,
    slipReference: value.slipReference,
    slipDate: value.slipDate,
  };
}

function toRefundValues(value: PaymentMethodValues): RefundMethodValues {
  return {
    refundPaymentMethod: value.paymentMethod,
    bank: value.bank,
    bankId: value.bankId,
    cardReference: value.cardReference,
    slipReference: value.slipReference,
    slipDate: value.slipDate,
  };
}

/** Refund cancel UI — same fields as record payment, with refund method rules. */
export function RefundMethodFields({
  value,
  onChange,
  errors = {},
  disabled,
  allowedMethods,
  onBanksError,
}: RefundMethodFieldsProps) {
  return (
    <PaymentMethodFields
      value={toPaymentValues(value)}
      onChange={(next) => onChange(toRefundValues(next))}
      errors={errors}
      disabled={disabled}
      allowedMethods={allowedMethods}
      methodLabel="Refund method"
      onBanksError={onBanksError}
    />
  );
}
