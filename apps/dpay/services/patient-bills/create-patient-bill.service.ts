import prisma from '@/lib/prisma';
import type { PatientBillDraft } from '@/types/patient-bill';
import { draftToCreatePayload } from '@/lib/patient-bills/mappers';
import { BILL_LINE_ITEM_STATUS } from '@/lib/patient-bills/line-item-status';
import { getNextSequenceNumber, isUniqueConstraintError } from '@/lib/patient-bills/sequence';

export type CreatePatientBillResult =
  | { success: true; id: string; bxtNumber: string; billNumber: string }
  | { success: false; message: string };

const MAX_NUMBER_RETRIES = 3;
const BILL_SCOPE_KEY = 'patient-bill-bill';

function isBhtDuplicateError(error: unknown): boolean {
  if (!isUniqueConstraintError(error)) return false;
  const target =
    error && typeof error === 'object' && 'meta' in error
      ? String((error as { meta?: { target?: unknown } }).meta?.target ?? '')
      : '';
  const message = error instanceof Error ? error.message : String(error);
  return target.includes('bxtNumber') || /bxtNumber/i.test(message);
}

export async function createPatientBill(
  draft: PatientBillDraft,
  createdBy?: string | null,
  createdByName?: string | null
): Promise<CreatePatientBillResult> {
  try {
    const payload = draftToCreatePayload(draft);
    const bhtNumber = payload.bxtNumber.trim();

    if (!bhtNumber) {
      return { success: false, message: 'BHT number is required.' };
    }

    const existingBht = await prisma.patientBill.findUnique({
      where: { bxtNumber: bhtNumber },
      select: { id: true },
    });
    if (existingBht) {
      return { success: false, message: `BHT number "${bhtNumber}" already exists.` };
    }

    for (let attempt = 1; attempt <= MAX_NUMBER_RETRIES; attempt++) {
      const billResult = await getNextSequenceNumber(BILL_SCOPE_KEY, { startFrom: 1 });
      if (!billResult.success) {
        return {
          success: false,
          message: 'Unable to generate bill number. Please try again.',
        };
      }
      const billNumber = `BILL-${String(billResult.value).padStart(6, '0')}`;

      try {
        const bill = await prisma.$transaction(async (tx) => {
          const created = await tx.patientBill.create({
            data: {
              bxtNumber: bhtNumber,
              billNumber,
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
              updatedBy: createdBy ?? undefined,
              updatedByName: createdByName ?? undefined,
              lineItems: {
                create: payload.lineItems.map((item) => ({
                  sortOrder: item.sortOrder,
                  doctorName: item.doctorName,
                  description: item.description,
                  amount: item.amount,
                  status: BILL_LINE_ITEM_STATUS.active,
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
          if (isBhtDuplicateError(error)) {
            return {
              success: false,
              message: `BHT number "${bhtNumber}" already exists.`,
            };
          }
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
    if (isBhtDuplicateError(error)) {
      return {
        success: false,
        message: `BHT number "${draft.bxtNumber.trim()}" already exists.`,
      };
    }
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
