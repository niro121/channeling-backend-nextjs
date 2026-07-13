import prisma from '@/lib/prisma';
import type { PatientBillDraft } from '@/types/patient-bill';
import { draftToCreatePayload } from '@/lib/patient-bills/mappers';

export type CreatePatientBillResult =
  | { success: true; id: string }
  | { success: false; message: string };

export async function createPatientBill(
  draft: PatientBillDraft,
  createdBy?: string | null
): Promise<CreatePatientBillResult> {
  try {
    const payload = draftToCreatePayload(draft);

    if (payload.lineItems.length === 0) {
      return { success: false, message: 'At least one line item is required' };
    }

    const bill = await prisma.patientBill.create({
      data: {
        bxtNumber: payload.bxtNumber,
        billNumber: payload.billNumber,
        admissionDate: payload.admissionDate,
        dischargeDate: payload.dischargeDate,
        customerName: payload.customerName,
        customerNicPhone: payload.customerNicPhone,
        customerAddress: payload.customerAddress,
        totalAmount: payload.totalAmount,
        paidAmount: payload.paidAmount,
        outstandingAmount: payload.outstandingAmount,
        status: payload.status,
        createdBy: createdBy ?? undefined,
        lineItems: {
          create: payload.lineItems,
        },
      },
      select: { id: true },
    });

    return { success: true, id: bill.id };
  } catch (error: unknown) {
    console.error('createPatientBill error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to save patient bill';
    return { success: false, message };
  }
}
