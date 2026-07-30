import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import type { EligibleDoctorBill } from '@/types/doctor-payment';
import { activeLineItemWhere } from '@/lib/patient-bills/line-item-status';

/** Line items not yet paid out to the doctor (null or field unset on older docs). */
const unpaidDoctorLineWhere: Prisma.PatientBillItemWhereInput = {
  AND: [
    activeLineItemWhere,
    { OR: [{ doctorPaymentId: null }, { doctorPaymentId: { isSet: false } }] },
  ],
};

/**
 * Paid patient bills with unpaid line items for the given doctor.
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
      status: 'paid',
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
