import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import type { DoctorOption } from '@/types/doctor-payment';
import { activeLineItemWhere } from '@/lib/patient-bills/line-item-status';

/** Line items not yet paid out to the doctor (null or field unset on older docs). */
const unpaidDoctorLineWhere: Prisma.PatientBillItemWhereInput = {
  AND: [
    activeLineItemWhere,
    { OR: [{ doctorPaymentId: null }, { doctorPaymentId: { isSet: false } }] },
  ],
};

/**
 * Distinct doctor names that have at least one unpaid line item on a fully paid patient bill.
 * Queried from paid bills (avoids flaky Mongo distinct + relation filters).
 */
export async function getDoctorsForPayment(): Promise<DoctorOption[]> {
  const bills = await prisma.patientBill.findMany({
    where: {
      status: 'paid',
      lineItems: {
        some: {
          AND: [{ doctorName: { not: '' } }, unpaidDoctorLineWhere],
        },
      },
    },
    select: {
      lineItems: {
        where: {
          AND: [{ doctorName: { not: '' } }, unpaidDoctorLineWhere],
        },
        select: { doctorName: true },
      },
    },
  });

  const names = new Set<string>();
  for (const bill of bills) {
    for (const item of bill.lineItems) {
      const name = item.doctorName.trim();
      if (name) names.add(name);
    }
  }

  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: name, name }));
}
