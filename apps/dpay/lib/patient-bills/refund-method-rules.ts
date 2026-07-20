import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import {
  PATIENT_BILL_PAYMENT_METHODS,
  isPatientBillPaymentMethod,
  type PatientBillPaymentMethod,
} from '@/types/patient-bill';
import { parsePaymentMethodCode, paymentMethodLabel } from '@/lib/receipts/helpers';

/**
 * Refund method rules:
 * - Cash → cash only
 * - Any other method → original method or cash
 */
export function resolvePatientBillPaymentMethod(
  method: PatientBillPaymentMethod | string | number | null | undefined
): PatientBillPaymentMethod | null {
  const code = parsePaymentMethodCode(method);
  if (code !== null && isPatientBillPaymentMethod(code)) {
    return code;
  }

  if (typeof method === 'string') {
    const legacy: Record<string, PatientBillPaymentMethod> = {
      cash: RECEIPT_PAYMENT_METHOD.CASH,
      card: RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
      bank_transfer: RECEIPT_PAYMENT_METHOD.SLIP,
      cheque: RECEIPT_PAYMENT_METHOD.CHECK,
      credit: RECEIPT_PAYMENT_METHOD.CREDIT,
      e_wallet: RECEIPT_PAYMENT_METHOD.E_WALLET,
      ewallet: RECEIPT_PAYMENT_METHOD.E_WALLET,
    };
    return legacy[method.trim().toLowerCase()] ?? null;
  }

  return null;
}

export function getAllowedRefundPaymentMethods(
  originalPaymentMethod: PatientBillPaymentMethod | string | number | null | undefined
): PatientBillPaymentMethod[] {
  const original = resolvePatientBillPaymentMethod(originalPaymentMethod);
  if (original == null) {
    return [RECEIPT_PAYMENT_METHOD.CASH];
  }
  if (original === RECEIPT_PAYMENT_METHOD.CASH) {
    return [RECEIPT_PAYMENT_METHOD.CASH];
  }
  return [original, RECEIPT_PAYMENT_METHOD.CASH];
}

/** Intersection of allowed refund methods across multiple original payments. */
export function getAllowedRefundPaymentMethodsForReceipts(
  originalPaymentMethods: Array<
    PatientBillPaymentMethod | string | number | null | undefined
  >
): PatientBillPaymentMethod[] {
  if (originalPaymentMethods.length === 0) {
    return [RECEIPT_PAYMENT_METHOD.CASH];
  }

  let allowed: Set<PatientBillPaymentMethod> | null = null;
  for (const original of originalPaymentMethods) {
    const methods = getAllowedRefundPaymentMethods(original);
    if (allowed == null) {
      allowed = new Set(methods);
    } else {
      for (const method of [...allowed]) {
        if (!methods.includes(method)) {
          allowed.delete(method);
        }
      }
    }
  }

  const result = PATIENT_BILL_PAYMENT_METHODS.map((m) => m.value).filter((m) =>
    allowed?.has(m) ?? false
  );
  return result.length > 0 ? result : [RECEIPT_PAYMENT_METHOD.CASH];
}

export function isRefundPaymentMethodAllowed(
  originalPaymentMethod: PatientBillPaymentMethod | string | number | null | undefined,
  refundPaymentMethod: PatientBillPaymentMethod
): boolean {
  return getAllowedRefundPaymentMethods(originalPaymentMethod).includes(
    refundPaymentMethod
  );
}

export function validateRefundPaymentMethodMessage(
  originalPaymentMethod: PatientBillPaymentMethod | string | number | null | undefined,
  refundPaymentMethod: PatientBillPaymentMethod
): string | null {
  if (isRefundPaymentMethodAllowed(originalPaymentMethod, refundPaymentMethod)) {
    return null;
  }
  const allowed = getAllowedRefundPaymentMethods(originalPaymentMethod)
    .map((m) => paymentMethodLabel(m))
    .join(' or ');
  const resolved = resolvePatientBillPaymentMethod(originalPaymentMethod);
  const originalLabel = paymentMethodLabel(resolved ?? originalPaymentMethod);
  return `Paid by ${originalLabel}: refund must be ${allowed}.`;
}

export function validateRefundPaymentMethodForReceiptsMessage(
  originalPaymentMethods: Array<
    PatientBillPaymentMethod | string | number | null | undefined
  >,
  refundPaymentMethod: PatientBillPaymentMethod
): string | null {
  const allowed = getAllowedRefundPaymentMethodsForReceipts(originalPaymentMethods);
  if (allowed.includes(refundPaymentMethod)) {
    return null;
  }
  const labels = allowed.map((m) => paymentMethodLabel(m)).join(' or ');
  return `Refund method must be ${labels} based on the original payment method(s).`;
}

export function defaultRefundPaymentMethod(
  originalPaymentMethod: PatientBillPaymentMethod | string | number | null | undefined
): PatientBillPaymentMethod {
  const allowed = getAllowedRefundPaymentMethods(originalPaymentMethod);
  const original = resolvePatientBillPaymentMethod(originalPaymentMethod);
  if (original != null && allowed.includes(original)) {
    return original;
  }
  return allowed[0] ?? RECEIPT_PAYMENT_METHOD.CASH;
}
