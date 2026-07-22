import { format } from 'date-fns';
import {
  PAYMENT_METHOD_NAMES,
  RECEIPT_PAYMENT_METHOD,
} from '@archmage/shared';
import {
  PATIENT_BILL_PAYMENT_METHODS,
  type PatientBillPaymentMethod,
  type PatientBillReceipt,
} from '@/types/patient-bill';

const LEGACY_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Credit Card',
  bank_transfer: 'Slip',
  cheque: 'Cheque',
  other: 'Other',
};

export function parsePaymentMethodCode(
  method: string | number | null | undefined
): number | null {
  if (typeof method === 'number' && Number.isFinite(method)) {
    return method;
  }
  if (typeof method === 'string' && /^\d+$/.test(method.trim())) {
    return Number(method.trim());
  }
  return null;
}

export function paymentMethodLabel(method: string | number | null | undefined): string {
  const code = parsePaymentMethodCode(method);
  if (code !== null && PAYMENT_METHOD_NAMES[code]) {
    return PAYMENT_METHOD_NAMES[code];
  }
  if (typeof method === 'string') {
    return LEGACY_PAYMENT_METHOD_LABELS[method] ?? method;
  }
  return method != null ? String(method) : '—';
}

/** Best single reference string for tables / timeline (legacy-aware). */
export function paymentReferenceDisplay(
  receipt: Pick<
    PatientBillReceipt,
    | 'paymentMethod'
    | 'referenceNumber'
    | 'bank'
    | 'cardReference'
    | 'slipReference'
    | 'slipDate'
  >
): string {
  const code = parsePaymentMethodCode(receipt.paymentMethod);
  const bank = receipt.bank?.trim() || '';
  const cardRef = receipt.cardReference?.trim() || '';
  const slipRef = receipt.slipReference?.trim() || '';
  const slipDate = receipt.slipDate
    ? format(new Date(receipt.slipDate), 'yyyy-MM-dd')
    : '';
  const legacy = receipt.referenceNumber?.trim() || '';

  if (code === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
    const parts = [bank, cardRef ? `****${cardRef}` : ''].filter(Boolean);
    return parts.join(' · ') || legacy || '—';
  }
  if (code === RECEIPT_PAYMENT_METHOD.SLIP) {
    const parts = [bank, slipRef, slipDate].filter(Boolean);
    return parts.join(' · ') || legacy || '—';
  }
  if (code === RECEIPT_PAYMENT_METHOD.CHECK) {
    const parts = [bank, slipRef, slipDate].filter(Boolean);
    return parts.join(' · ') || legacy || '—';
  }
  if (code === RECEIPT_PAYMENT_METHOD.E_WALLET) {
    return cardRef || legacy || '—';
  }

  return legacy || [bank, cardRef, slipRef].filter(Boolean).join(' · ') || '—';
}

export function paymentMethodSelectValue(
  method: PatientBillPaymentMethod | ''
): string {
  return method === '' ? '' : String(method);
}

export function paymentMethodFromSelectValue(
  value: string
): PatientBillPaymentMethod | '' {
  const code = parsePaymentMethodCode(value);
  if (code === null) return '';
  const match = PATIENT_BILL_PAYMENT_METHODS.find((m) => m.value === code);
  return match?.value ?? '';
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
