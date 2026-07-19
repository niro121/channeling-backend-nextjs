import prisma from '@/lib/prisma';
import type { PatientBillDraft } from '@/types/patient-bill';
import { draftToUpdatePayload } from '@/lib/patient-bills/mappers';
import {
  isMongoObjectId,
  lineItemSnapshotChanged,
} from '@/lib/patient-bills/line-item-history';

export type UpdatePatientBillResult =
  | { success: true; id: string }
  | { success: false; message: string };

export async function updatePatientBill(
  id: string,
  draft: PatientBillDraft,
  updatedBy?: string | null,
  updatedByName?: string | null
): Promise<UpdatePatientBillResult> {
  if (!id?.trim()) {
    return { success: false, message: 'Invalid bill ID' };
  }

  try {
    const existing = await prisma.patientBill.findUnique({
      where: { id },
      select: {
        id: true,
        paidAmount: true,
        status: true,
        lineItems: {
          select: {
            id: true,
            doctorName: true,
            description: true,
            amount: true,
            sortOrder: true,
            doctorPaymentId: true,
          },
        },
      },
    });

    if (!existing) {
      return { success: false, message: 'Patient bill not found' };
    }

    if (existing.status === 'cancelled') {
      return { success: false, message: 'Cannot edit a cancelled patient bill.' };
    }

    if (existing.status === 'closed') {
      return { success: false, message: 'Cannot edit a closed patient bill.' };
    }

    const payload = draftToUpdatePayload(draft, existing.paidAmount);

    if (existing.paidAmount > 0 && payload.lineItems.length === 0) {
      return {
        success: false,
        message: 'Cannot remove all doctor charges while payments have been recorded.',
      };
    }

    const existingById = new Map(existing.lineItems.map((item) => [item.id, item]));
    const keptIds = new Set<string>();

    for (const item of payload.lineItems) {
      if (isMongoObjectId(item.id) && existingById.has(item.id)) {
        keptIds.add(item.id);
      }
    }

    const removedItems = existing.lineItems.filter((item) => !keptIds.has(item.id));
    const blockedRemoval = removedItems.find((item) => item.doctorPaymentId);
    if (blockedRemoval) {
      return {
        success: false,
        message:
          'Cannot remove a line item that is linked to a doctor payment. Cancel the doctor payment first.',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.patientBill.update({
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
        },
      });

      for (const item of payload.lineItems) {
        const existingItem =
          isMongoObjectId(item.id) && existingById.has(item.id)
            ? existingById.get(item.id)!
            : null;

        if (existingItem) {
          const next = {
            doctorName: item.doctorName,
            description: item.description,
            amount: item.amount,
            sortOrder: item.sortOrder,
          };
          const previous = {
            doctorName: existingItem.doctorName,
            description: existingItem.description,
            amount: existingItem.amount,
            sortOrder: existingItem.sortOrder,
          };

          if (!lineItemSnapshotChanged(previous, next)) {
            continue;
          }

          await tx.patientBillItem.update({
            where: { id: existingItem.id },
            data: {
              ...next,
              updatedBy: updatedBy ?? undefined,
              updatedByName: updatedByName ?? undefined,
            },
          });

          await tx.patientBillItemHistory.create({
            data: {
              billId: id,
              lineItemId: existingItem.id,
              action: 'updated',
              changedBy: updatedBy ?? undefined,
              changedByName: updatedByName ?? undefined,
              doctorName: next.doctorName,
              description: next.description,
              amount: next.amount,
              sortOrder: next.sortOrder,
              previousDoctorName: previous.doctorName,
              previousDescription: previous.description,
              previousAmount: previous.amount,
              previousSortOrder: previous.sortOrder,
            },
          });
        } else {
          const created = await tx.patientBillItem.create({
            data: {
              billId: id,
              sortOrder: item.sortOrder,
              doctorName: item.doctorName,
              description: item.description,
              amount: item.amount,
              createdBy: updatedBy ?? undefined,
              createdByName: updatedByName ?? undefined,
            },
            select: { id: true },
          });

          await tx.patientBillItemHistory.create({
            data: {
              billId: id,
              lineItemId: created.id,
              action: 'created',
              changedBy: updatedBy ?? undefined,
              changedByName: updatedByName ?? undefined,
              doctorName: item.doctorName,
              description: item.description,
              amount: item.amount,
              sortOrder: item.sortOrder,
            },
          });
        }
      }

      for (const removed of removedItems) {
        await tx.patientBillItemHistory.create({
          data: {
            billId: id,
            lineItemId: removed.id,
            action: 'deleted',
            changedBy: updatedBy ?? undefined,
            changedByName: updatedByName ?? undefined,
            doctorName: removed.doctorName,
            description: removed.description,
            amount: removed.amount,
            sortOrder: removed.sortOrder,
          },
        });

        await tx.patientBillItem.delete({ where: { id: removed.id } });
      }
    });

    return { success: true, id };
  } catch (error: unknown) {
    console.error('updatePatientBill error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update patient bill';
    return { success: false, message };
  }
}
