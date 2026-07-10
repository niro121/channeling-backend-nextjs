import prisma from '@/lib/prisma';
import type { PatientBillDraft } from '@/types/patient-bill';
import { draftToUpdatePayload } from '@/lib/patient-bills/mappers';

export type UpdatePatientBillResult =
  | { success: true; id: string }
  | { success: false; message: string };

export async function updatePatientBill(
  id: string,
  draft: PatientBillDraft
): Promise<UpdatePatientBillResult> {
  if (!id?.trim()) {
    return { success: false, message: 'Invalid bill ID' };
  }

  try {
    const existing = await prisma.patientBill.findUnique({
      where: { id },
      select: { id: true, paidAmount: true },
    });

    if (!existing) {
      return { success: false, message: 'Patient bill not found' };
    }

    const payload = draftToUpdatePayload(draft, existing.paidAmount);

    if (payload.lineItems.length === 0) {
      return { success: false, message: 'At least one line item is required' };
    }

    await prisma.$transaction([
      prisma.patientBillItem.deleteMany({ where: { billId: id } }),
      prisma.patientBill.update({
        where: { id },
        data: {
          admissionDate: payload.admissionDate,
          dischargeDate: payload.dischargeDate,
          customerName: payload.customerName,
          customerNicPhone: payload.customerNicPhone,
          customerAddress: payload.customerAddress,
          totalAmount: payload.totalAmount,
          outstandingAmount: payload.outstandingAmount,
          status: payload.status,
          lineItems: {
            create: payload.lineItems,
          },
        },
      }),
    ]);

    return { success: true, id };
  } catch (error: unknown) {
    console.error('updatePatientBill error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update patient bill';
    return { success: false, message };
  }
}
