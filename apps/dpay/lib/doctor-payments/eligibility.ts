import type { Prisma } from '@/lib/generated/prisma';
import { activeLineItemWhere } from '@/lib/patient-bills/line-item-status';
import type { PatientBillStatus } from '@/types/patient-bill';

/**
 * Patient bill statuses where doctor fee lines may be paid out.
 * Patient payment is not required — unpaid / partial bills are eligible.
 * Draft / cancelled / closed bills are never included.
 */
export const DOCTOR_PAYOUT_BILL_STATUSES = [
  'pending',
  'partial',
  'paid',
  'over_paid',
] as const satisfies readonly PatientBillStatus[];

export type DoctorPayoutBillStatus = (typeof DOCTOR_PAYOUT_BILL_STATUSES)[number];

/** Line items not yet paid out to the doctor (null or field unset on older docs). */
export const unpaidDoctorLineWhere: Prisma.PatientBillItemWhereInput = {
  AND: [
    activeLineItemWhere,
    { OR: [{ doctorPaymentId: null }, { doctorPaymentId: { isSet: false } }] },
  ],
};

/** Bills that can appear in doctor payout eligibility queries. */
export const eligibleDoctorPayoutBillWhere: Prisma.PatientBillWhereInput = {
  status: { in: [...DOCTOR_PAYOUT_BILL_STATUSES] },
};

/** True when a line item is linked to an active doctor payment. */
export function isDoctorPaidLineItem(item: {
  doctorPaymentId?: string | null;
}): boolean {
  return Boolean(item.doctorPaymentId);
}
