import prisma from '@/lib/prisma';
import type { PatientBillDetail } from '@/types/patient-bill';
import { mapPatientBillDetail } from '@/lib/patient-bills/mappers';

export type GetPatientBillResult =
  | { success: true; data: PatientBillDetail }
  | { success: false; message: string };

export async function getPatientBillById(id: string): Promise<GetPatientBillResult> {
  if (!id?.trim()) {
    return { success: false, message: 'Invalid bill ID' };
  }

  try {
    const record = await prisma.patientBill.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        receipts: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!record) {
      return { success: false, message: 'Patient bill not found' };
    }

    return { success: true, data: mapPatientBillDetail(record) };
  } catch (error: unknown) {
    console.error('getPatientBillById error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch patient bill';
    return { success: false, message };
  }
}
