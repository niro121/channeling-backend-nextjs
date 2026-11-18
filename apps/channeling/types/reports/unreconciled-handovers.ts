import { RECEIPT_PAYMENT_METHOD } from '@/types/receipt';

/** Non-cash methods reconciliation can credit off the till, in report order. */
export const UNRECONCILED_DEDUCTED_METHODS = [
  { method: RECEIPT_PAYMENT_METHOD.CREDIT_CARD, label: 'Credit Card', tillKey: 'cardCents' },
  { method: RECEIPT_PAYMENT_METHOD.SLIP, label: 'Slip', tillKey: 'slipCents' },
  { method: RECEIPT_PAYMENT_METHOD.CHECK, label: 'Cheque', tillKey: 'checkCents' },
  { method: RECEIPT_PAYMENT_METHOD.E_WALLET, label: 'E-Wallet', tillKey: 'eWalletCents' },
] as const;

/** Still on the till, but reconciliation never deducts these. */
export const UNRECONCILED_TILL_ONLY_METHODS = [
  {
    method: RECEIPT_PAYMENT_METHOD.CASH,
    label: 'Cash',
    tillKey: 'cashCents',
    note: 'Reconciliation does not deduct cash.',
  },
  {
    method: RECEIPT_PAYMENT_METHOD.CREDIT,
    label: 'Credit',
    tillKey: 'creditCents',
    note: 'Reconciliation does not deduct credit.',
  },
] as const;

export const UNRECONCILED_PAYMENT_TYPE_OPTIONS = [
  ...UNRECONCILED_DEDUCTED_METHODS.map((method) => ({
    id: String(method.method),
    name: method.label,
  })),
  ...UNRECONCILED_TILL_ONLY_METHODS.map((method) => ({
    id: String(method.method),
    name: method.label,
  })),
];

/** null means every payment type. */
export function parseUnreconciledPaymentType(value: string | undefined): number | null {
  const raw = (value ?? '').trim();
  if (!raw || raw === '__all__') return null;
  const match = UNRECONCILED_PAYMENT_TYPE_OPTIONS.find((option) => option.id === raw);
  return match ? Number(match.id) : Number.NaN;
}

export function unreconciledPaymentTypeLabel(value: string | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw || raw === '__all__') return 'All payment types';
  return UNRECONCILED_PAYMENT_TYPE_OPTIONS.find((option) => option.id === raw)?.name ?? raw;
}

export type UnreconciledHandoversReportQuery = {
  /** Bulk cashier whose till is being checked. */
  userId: string;
  /** '__all__' or a payment method code. */
  paymentMethod?: string;
};

export type UnreconciledHandoverRowKind = 'balance' | 'item' | 'subtotal';

export type UnreconciledHandoversReportRow = {
  id: string;
  groupKey: string;
  groupLabel: string;
  rowKind: UnreconciledHandoverRowKind;
  methodLabel: string;
  tillCents: number | null;
  undeductedCents: number | null;
  differenceCents: number | null;
  note: string;
  handoverNo: string;
  reconciliationNo: string;
  fromUserName: string;
  createdAt: string;
  reconciliationStatusLabel: string;
  receiptNo: string;
  /** Included handover this line came from, when it is not the top document. */
  sourceHandoverNo: string;
  bank: string;
  reference: string;
  amountCents: number | null;
  why: string;
};

export type UnreconciledHandoversReportExportRow = {
  rowKind: UnreconciledHandoverRowKind;
  groupLabel: string;
  method: string;
  tillBalance: string;
  notDeducted: string;
  difference: string;
  note: string;
  handover: string;
  reconciliationNo: string;
  fromUser: string;
  createdAt: string;
  status: string;
  receipt: string;
  sourceHandover: string;
  bank: string;
  reference: string;
  amount: string;
  why: string;
  tillCents: number | null;
  undeductedCents: number | null;
  differenceCents: number | null;
  amountCents: number | null;
};
