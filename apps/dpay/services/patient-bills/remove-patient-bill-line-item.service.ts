import prisma from '@/lib/prisma';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import {
  activeLineItemWhere,
  BILL_LINE_ITEM_STATUS,
  isDeletedLineItem,
  normalizeLineItemStatus,
} from '@/lib/patient-bills/line-item-status';

export type RemovePatientBillLineItemResult =
  | { success: true; id: string }
  | { success: false; message: string };

export async function removePatientBillLineItem(
  billId: string,
  lineItemId: string,
  removedBy?: string | null,
  removedByName?: string | null
): Promise<RemovePatientBillLineItemResult> {
  if (!billId?.trim() || !lineItemId?.trim()) {
    return { success: false, message: 'Invalid bill or line item ID' };
  }

  try {
    const existing = await prisma.patientBill.findUnique({
      where: { id: billId },
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
            status: true,
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

    const item = existing.lineItems.find((line) => line.id === lineItemId);
    if (!item) {
      return { success: false, message: 'Line item not found' };
    }

    if (isDeletedLineItem({ status: normalizeLineItemStatus(item.status) })) {
      return { success: false, message: 'This line item has already been removed.' };
    }

    if (item.doctorPaymentId) {
      return {
        success: false,
        message:
          'Cannot remove a line item that is linked to a doctor payment. Cancel the doctor payment first.',
      };
    }

    const activeItems = existing.lineItems.filter(
      (line) => !isDeletedLineItem({ status: normalizeLineItemStatus(line.status) })
    );
    const remainingActiveCount = activeItems.length - 1;

    if (existing.paidAmount > 0 && remainingActiveCount === 0) {
      return {
        success: false,
        message: 'Cannot remove all doctor charges while payments have been recorded.',
      };
    }

    const totalAmount = activeItems
      .filter((line) => line.id !== lineItemId)
      .reduce((sum, line) => sum + line.amount, 0);
    const outstandingAmount = Math.max(0, totalAmount - existing.paidAmount);
    const status = computeBillPaymentStatus(existing.paidAmount, totalAmount);
    const deletedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.patientBillItemHistory.create({
        data: {
          billId,
          lineItemId: item.id,
          action: 'deleted',
          changedBy: removedBy ?? undefined,
          changedByName: removedByName ?? undefined,
          doctorName: item.doctorName,
          description: item.description,
          amount: item.amount,
          sortOrder: item.sortOrder,
        },
      });

      await tx.patientBillItem.update({
        where: { id: lineItemId },
        data: {
          status: BILL_LINE_ITEM_STATUS.deleted,
          deletedAt,
          deletedBy: removedBy ?? undefined,
          deletedByName: removedByName ?? undefined,
          updatedBy: removedBy ?? undefined,
          updatedByName: removedByName ?? undefined,
        },
      });

      await tx.patientBill.update({
        where: { id: billId },
        data: {
          totalAmount,
          outstandingAmount,
          status,
          updatedBy: removedBy ?? undefined,
          updatedByName: removedByName ?? undefined,
        },
      });
    });

    return { success: true, id: billId };
  } catch (error: unknown) {
    console.error('removePatientBillLineItem error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to remove line item';
    return { success: false, message };
  }
}
