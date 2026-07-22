import prisma from '@/lib/prisma';

export type ClosePatientBillResult =
  | { success: true }
  | { success: false; message: string };

/**
 * Permanently close a fully paid patient bill.
 * Only allowed when status is `paid`. Closed bills cannot be edited or modified.
 */
export async function closePatientBill(
  billId: string,
  updatedBy?: string | null,
  updatedByName?: string | null
): Promise<ClosePatientBillResult> {
  if (!billId?.trim()) {
    return { success: false, message: 'Bill id is required.' };
  }

  try {
    const bill = await prisma.patientBill.findUnique({
      where: { id: billId },
      select: { id: true, status: true },
    });

    if (!bill) {
      return { success: false, message: 'Patient bill not found.' };
    }

    if (bill.status === 'closed') {
      return { success: false, message: 'This patient bill is already closed.' };
    }

    if (bill.status === 'cancelled') {
      return { success: false, message: 'Cannot close a cancelled patient bill.' };
    }

    if (bill.status !== 'paid') {
      return {
        success: false,
        message: 'Only fully paid bills can be closed.',
      };
    }

    await prisma.patientBill.update({
      where: { id: bill.id },
      data: {
        status: 'closed',
        updatedBy: updatedBy ?? undefined,
        updatedByName: updatedByName ?? undefined,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('closePatientBill failed', error);
    const message =
      error instanceof Error ? error.message : 'Failed to close patient bill.';
    return { success: false, message };
  }
}
