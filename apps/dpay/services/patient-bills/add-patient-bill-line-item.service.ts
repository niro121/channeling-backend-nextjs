import prisma from '@/lib/prisma';
import type { AddPatientBillLineItemInput } from '@/types/patient-bill';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import { activeLineItemWhere, BILL_LINE_ITEM_STATUS } from '@/lib/patient-bills/line-item-status';

export type AddPatientBillLineItemResult =
  | { success: true; id: string; lineItemId: string }
  | { success: false; message: string };

export async function addPatientBillLineItem(
  input: AddPatientBillLineItemInput,
  createdBy?: string | null,
  createdByName?: string | null
): Promise<AddPatientBillLineItemResult> {
  const billId = input.billId?.trim();
  if (!billId) {
    return { success: false, message: 'Invalid bill ID' };
  }

  const doctorName = input.doctorName.trim();
  const description = input.description.trim();

  if (!doctorName) {
    return { success: false, message: 'Doctor name is required' };
  }

  if (!description) {
    return { success: false, message: 'Description is required' };
  }

  if (input.amount < 0) {
    return { success: false, message: 'Amount cannot be negative' };
  }

  try {
    const existing = await prisma.patientBill.findUnique({
      where: { id: billId },
      select: {
        id: true,
        paidAmount: true,
        status: true,
        lineItems: {
          select: { sortOrder: true },
          orderBy: { sortOrder: 'desc' },
          take: 1,
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

    const nextSortOrder = (existing.lineItems[0]?.sortOrder ?? -1) + 1;
    const nextTotal =
      (await prisma.patientBillItem.aggregate({
        where: {
          billId,
          AND: [activeLineItemWhere],
        },
        _sum: { amount: true },
      }))._sum.amount ?? 0;
    const totalAmount = nextTotal + input.amount;
    const outstandingAmount = Math.max(0, totalAmount - existing.paidAmount);
    const status = computeBillPaymentStatus(existing.paidAmount, totalAmount);

    const lineItemId = await prisma.$transaction(async (tx) => {
      const created = await tx.patientBillItem.create({
        data: {
          billId,
          sortOrder: nextSortOrder,
          doctorName,
          description,
          amount: input.amount,
          status: BILL_LINE_ITEM_STATUS.active,
          createdBy: createdBy ?? undefined,
          createdByName: createdByName ?? undefined,
        },
        select: { id: true },
      });

      await tx.patientBillItemHistory.create({
        data: {
          billId,
          lineItemId: created.id,
          action: 'created',
          changedBy: createdBy ?? undefined,
          changedByName: createdByName ?? undefined,
          doctorName,
          description,
          amount: input.amount,
          sortOrder: nextSortOrder,
        },
      });

      await tx.patientBill.update({
        where: { id: billId },
        data: {
          totalAmount,
          outstandingAmount,
          status,
          updatedBy: createdBy ?? undefined,
          updatedByName: createdByName ?? undefined,
        },
      });

      return created.id;
    });

    return { success: true, id: billId, lineItemId };
  } catch (error: unknown) {
    console.error('addPatientBillLineItem error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to add line item';
    return { success: false, message };
  }
}
