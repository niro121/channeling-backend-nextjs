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
 * One row per bill; payable = sum of that doctor's unpaid line amounts.
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
    .filter((bill) => bill.lineItems.length > 0)
    .map((bill) => {
      const doctorFee = bill.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const discount = 0;
      const refund = 0;
      const payableAmount = Math.max(0, doctorFee - discount - refund);

      return {
        billId: bill.id,
        billNumber: bill.billNumber,
        patientName: bill.customerName,
        admissionDate: bill.admissionDate.toISOString(),
        billStatus: normalizeBillStatus(bill.status),
        doctorName: name,
        doctorFee,
        discount,
        refund,
        payableAmount,
        lineItemIds: bill.lineItems.map((item) => item.id),
      };
    })
    .filter((row) => row.payableAmount > 0);
}
