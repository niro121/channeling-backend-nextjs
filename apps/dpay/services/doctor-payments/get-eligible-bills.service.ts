import prisma from '@/lib/prisma';
import type { EligibleDoctorBill } from '@/types/doctor-payment';
import {
  DOCTOR_PAYOUT_BILL_STATUSES,
  eligibleDoctorPayoutBillWhere,
  unpaidDoctorLineWhere,
  type DoctorPayoutBillStatus,
} from '@/lib/doctor-payments/eligibility';

function normalizeBillStatus(status: string): DoctorPayoutBillStatus {
  if (
    (DOCTOR_PAYOUT_BILL_STATUSES as readonly string[]).includes(status)
  ) {
    return status as DoctorPayoutBillStatus;
  }
  return 'pending';
}

/**
 * Open patient bills (pending / partial / paid / over_paid) with unpaid line items for the given doctor.
 * Patient payment is not required — doctor fees can be paid before the patient settles.
 * One row per unpaid line item (same bill + doctor can appear multiple times).
 * Discount / refund are 0 in v1 (no fields on line items yet).
 */
export async function getEligibleBillsForDoctor(
  doctorName: string
): Promise<EligibleDoctorBill[]> {
  const name = doctorName.trim();
  if (!name) return [];

  const bills = await prisma.patientBill.findMany({
    where: {
      ...eligibleDoctorPayoutBillWhere,
      lineItems: {
        some: {
          AND: [{ doctorName: name }, unpaidDoctorLineWhere],
        },
      },
    },
    orderBy: { admissionDate: 'desc' },
    include: {
      lineItems: {
        where: {
          AND: [{ doctorName: name }, unpaidDoctorLineWhere],
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return bills
    .flatMap((bill) =>
      bill.lineItems.map((item) => {
        const doctorFee = item.amount || 0;
        const discount = 0;
        const refund = 0;
        const payableAmount = Math.max(0, doctorFee - discount - refund);

        return {
          lineItemId: item.id,
          billId: bill.id,
          billNumber: bill.billNumber,
          bxtNumber: bill.bxtNumber,
          patientName: bill.customerName,
          admissionDate: bill.admissionDate.toISOString(),
          billStatus: normalizeBillStatus(bill.status),
          doctorName: name,
          description: item.description,
          doctorFee,
          discount,
          refund,
          payableAmount,
          lineItemIds: [item.id],
        } satisfies EligibleDoctorBill;
      })
    )
    .filter((row) => row.payableAmount > 0);
}
