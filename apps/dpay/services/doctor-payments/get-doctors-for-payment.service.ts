import prisma from '@/lib/prisma';
import type { DoctorOption } from '@/types/doctor-payment';
import {
  eligibleDoctorPayoutBillWhere,
  unpaidDoctorLineWhere,
} from '@/lib/doctor-payments/eligibility';

/**
 * Distinct doctor names that have at least one unpaid line item on an open patient bill
 * (pending / partial / paid). Patient payment is not required.
 */
export async function getDoctorsForPayment(): Promise<DoctorOption[]> {
  const bills = await prisma.patientBill.findMany({
    where: {
      ...eligibleDoctorPayoutBillWhere,
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
