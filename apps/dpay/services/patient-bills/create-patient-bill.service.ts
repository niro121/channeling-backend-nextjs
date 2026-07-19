import prisma from '@/lib/prisma';
import type { PatientBillDraft } from '@/types/patient-bill';
import { draftToCreatePayload } from '@/lib/patient-bills/mappers';
import { isUniqueConstraintError } from '@/lib/patient-bills/sequence';
import { generateBillNumbers } from './generate-bill-numbers.service';

export type CreatePatientBillResult =
  | { success: true; id: string; bxtNumber: string; billNumber: string }
  | { success: false; message: string };

const MAX_NUMBER_RETRIES = 3;

export async function createPatientBill(
  draft: PatientBillDraft,
  createdBy?: string | null,
  createdByName?: string | null
): Promise<CreatePatientBillResult> {
  try {
    const payload = draftToCreatePayload(draft);

    for (let attempt = 1; attempt <= MAX_NUMBER_RETRIES; attempt++) {
      const numbers = await generateBillNumbers();

      try {
        const bill = await prisma.$transaction(async (tx) => {
          const created = await tx.patientBill.create({
            data: {
              bxtNumber: numbers.bxtNumber,
              billNumber: numbers.billNumber,
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
              createdByName: createdByName ?? undefined,
              lineItems: {
                create: payload.lineItems.map((item) => ({
                  sortOrder: item.sortOrder,
                  doctorName: item.doctorName,
                  description: item.description,
                  amount: item.amount,
                  createdBy: createdBy ?? undefined,
                  createdByName: createdByName ?? undefined,
                })),
              },
            },
            include: {
              lineItems: {
                select: {
                  id: true,
                  doctorName: true,
                  description: true,
                  amount: true,
                  sortOrder: true,
                },
              },
            },
          });

          if (created.lineItems.length > 0) {
            await tx.patientBillItemHistory.createMany({
              data: created.lineItems.map((item) => ({
                billId: created.id,
                lineItemId: item.id,
                action: 'created',
                changedBy: createdBy ?? undefined,
                changedByName: createdByName ?? undefined,
                doctorName: item.doctorName,
                description: item.description,
                amount: item.amount,
                sortOrder: item.sortOrder,
              })),
            });
          }

          return {
            id: created.id,
            bxtNumber: created.bxtNumber,
            billNumber: created.billNumber,
          };
        });

        return {
          success: true,
          id: bill.id,
          bxtNumber: bill.bxtNumber,
          billNumber: bill.billNumber,
        };
      } catch (error: unknown) {
        if (isUniqueConstraintError(error) && attempt < MAX_NUMBER_RETRIES) {
          continue;
        }
        throw error;
      }
    }

    return {
      success: false,
      message: 'Could not assign a unique bill number. Please try again.',
    };
  } catch (error: unknown) {
    console.error('createPatientBill error', error);
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        message: 'This bill number was just used. Please try saving again.',
      };
    }
    const message =
      error instanceof Error ? error.message : 'Failed to save patient bill';
    return { success: false, message };
  }
}
