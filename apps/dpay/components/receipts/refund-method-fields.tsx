'use client';

import { useEffect, useState } from 'react';
import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@archmage/ui';
import { getChannelingBanksAction } from '@/app/actions/channeling/banks.actions';
import type { ChannelingBankOption } from '@/services/channeling/get-banks.service';
import {
  PATIENT_BILL_PAYMENT_METHODS,
  type PatientBillPaymentMethod,
} from '@/types/patient-bill';
import type { RecordPaymentFormErrors } from '@/lib/patient-bills/payment-validations';
import {
  paymentMethodFromSelectValue,
  paymentMethodSelectValue,
} from '@/lib/receipts/helpers';

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

function BankSelect({
  banks,
  loading,
  value,
  error,
  disabled,
  onChange,
}: {
  banks: ChannelingBankOption[];
  loading: boolean;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (bankId: string, bankName: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">Bank</Label>
      <Select
        value={value || undefined}
        onValueChange={(bankId) => {
          const selected = banks.find((b) => b.id === bankId);
          onChange(bankId, selected?.name ?? '');
        }}
        disabled={disabled || loading || banks.length === 0}
      >
        <SelectTrigger className={`h-8 text-sm ${error ? 'border-destructive' : ''}`}>
          <SelectValue placeholder={loading ? 'Loading banks…' : 'Select bank'} />
        </SelectTrigger>
        <SelectContent>
          {banks.map((bank) => (
            <SelectItem key={bank.id} value={bank.id}>
              {bank.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function emptyRefundMethodValues(
  method: PatientBillPaymentMethod = RECEIPT_PAYMENT_METHOD.CASH
): RefundMethodValues {
  return {
    refundPaymentMethod: method,
    bank: '',
    bankId: '',
    cardReference: '',
    slipReference: '',
    slipDate: '',
  };
}

export function RefundMethodFields({
  value,
  onChange,
  errors = {},
  disabled,
  allowedMethods,
  onBanksError,
}: RefundMethodFieldsProps) {
  const [banks, setBanks] = useState<ChannelingBankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);

  const methodOptions =
    allowedMethods && allowedMethods.length > 0
      ? PATIENT_BILL_PAYMENT_METHODS.filter((item) => allowedMethods.includes(item.value))
      : PATIENT_BILL_PAYMENT_METHODS;

  const method = value.refundPaymentMethod;
  const showCard = method === RECEIPT_PAYMENT_METHOD.CREDIT_CARD;
  const showSlip = method === RECEIPT_PAYMENT_METHOD.SLIP;
  const showCheque = method === RECEIPT_PAYMENT_METHOD.CHECK;
  const showEWallet = method === RECEIPT_PAYMENT_METHOD.E_WALLET;
  const needsBanks = showCard || showSlip || showCheque;

  useEffect(() => {
    if (methodOptions.some((item) => item.value === method)) return;
    const fallback = methodOptions[0]?.value;
    if (fallback != null) {
      onChange(emptyRefundMethodValues(fallback));
    }
    // Sync selected method when allowed list shrinks
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when allowed set / method mismatch
  }, [method, allowedMethods]);

  useEffect(() => {
    if (!needsBanks) return;
    let cancelled = false;
    setBanksLoading(true);
    void getChannelingBanksAction()
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setBanks(result.data ?? []);
        } else {
          setBanks([]);
          onBanksError?.(result.message ?? 'Failed to load banks');
        }
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsBanks, onBanksError]);

  const patch = (partial: Partial<RefundMethodValues>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs font-medium">Refund method</Label>
        <Select
          value={paymentMethodSelectValue(method)}
          onValueChange={(nextValue) => {
            const next = paymentMethodFromSelectValue(nextValue);
            if (next === '') return;
            if (allowedMethods && !allowedMethods.includes(next)) return;
            onChange(emptyRefundMethodValues(next));
          }}
          disabled={disabled || methodOptions.length <= 1}
        >
          <SelectTrigger
            className={`h-8 text-sm ${errors.paymentMethod ? 'border-destructive' : ''}`}
          >
            <SelectValue placeholder="Select refund method" />
          </SelectTrigger>
          <SelectContent>
            {methodOptions.map((item) => (
              <SelectItem key={item.value} value={String(item.value)}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.paymentMethod ? (
          <p className="text-[11px] text-destructive">{errors.paymentMethod}</p>
        ) : null}
        {methodOptions.length === 1 &&
        methodOptions[0]?.value === RECEIPT_PAYMENT_METHOD.CASH ? (
          <p className="text-[11px] text-muted-foreground">
            Refund must be cash for this payment.
          </p>
        ) : methodOptions.length > 1 ? (
          <p className="text-[11px] text-muted-foreground">
            Refund via original method or cash only.
          </p>
        ) : null}
      </div>

      {showCard ? (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label htmlFor="refund-card-last4" className="text-xs font-medium">
              Last 4 Digits
            </Label>
            <Input
              id="refund-card-last4"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              className={`h-8 text-sm tabular-nums ${errors.cardReference ? 'border-destructive' : ''}`}
              value={value.cardReference}
              disabled={disabled}
              onChange={(e) =>
                patch({ cardReference: e.target.value.replace(/\D/g, '').slice(0, 4) })
              }
            />
            {errors.cardReference ? (
              <p className="text-[11px] text-destructive">{errors.cardReference}</p>
            ) : null}
          </div>
          <BankSelect
            banks={banks}
            loading={banksLoading}
            value={value.bankId}
            error={errors.bank}
            disabled={disabled}
            onChange={(id, name) => patch({ bankId: id, bank: name })}
          />
        </div>
      ) : null}

      {showSlip || showCheque ? (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <Label htmlFor="refund-slip-ref" className="text-xs font-medium">
              {showCheque ? 'Cheque No' : 'Slip Ref'}
            </Label>
            <Input
              id="refund-slip-ref"
              placeholder={showCheque ? 'Cheque number' : 'Bank reference'}
              className={`h-8 text-sm ${errors.slipReference ? 'border-destructive' : ''}`}
              value={value.slipReference}
              disabled={disabled}
              onChange={(e) => patch({ slipReference: e.target.value })}
            />
            {errors.slipReference ? (
              <p className="text-[11px] text-destructive">{errors.slipReference}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="refund-slip-date" className="text-xs font-medium">
              {showCheque ? 'Cheque Date' : 'Slip Date'}
            </Label>
            <Input
              id="refund-slip-date"
              type="date"
              className={`h-8 text-sm ${errors.slipDate ? 'border-destructive' : ''}`}
              value={value.slipDate}
              disabled={disabled}
              onChange={(e) => patch({ slipDate: e.target.value })}
            />
            {errors.slipDate ? (
              <p className="text-[11px] text-destructive">{errors.slipDate}</p>
            ) : null}
          </div>
          <BankSelect
            banks={banks}
            loading={banksLoading}
            value={value.bankId}
            error={errors.bank}
            disabled={disabled}
            onChange={(id, name) => patch({ bankId: id, bank: name })}
          />
        </div>
      ) : null}

      {showEWallet ? (
        <div className="space-y-1">
          <Label htmlFor="refund-ewallet-ref" className="text-xs font-medium">
            E-Wallet Reference
          </Label>
          <Input
            id="refund-ewallet-ref"
            placeholder="Transaction reference"
            className={`h-8 text-sm ${errors.cardReference ? 'border-destructive' : ''}`}
            value={value.cardReference}
            disabled={disabled}
            onChange={(e) => patch({ cardReference: e.target.value })}
          />
          {errors.cardReference ? (
            <p className="text-[11px] text-destructive">{errors.cardReference}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
