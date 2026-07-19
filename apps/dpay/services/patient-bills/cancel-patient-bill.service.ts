import prisma from '@/lib/prisma';

export type CancelPatientBillInput = {
  billId: string;
  cancelReason: string;
  canceledBy: string | null;
  canceledByName: string | null;
};

export type CancelPatientBillResult =
  | { success: true; voidedReceiptCount: number }
  | { success: false; message: string };

/**
 * Soft-cancel a patient bill and void all linked receipts in one transaction.
 * Blocked when any line item is still linked to a non-cancelled doctor payment.
 */
export async function cancelPatientBill(
  input: CancelPatientBillInput
): Promise<CancelPatientBillResult> {
  const reason = input.cancelReason?.trim() ?? '';
  if (!reason) {
    return { success: false, message: 'Cancel reason is required.' };
  }
  if (!input.billId?.trim()) {
    return { success: false, message: 'Bill id is required.' };
  }

  const bill = await prisma.patientBill.findUnique({
    where: { id: input.billId },
    select: {
      id: true,
      status: true,
      billNumber: true,
      lineItems: {
        select: {
          id: true,
          doctorPaymentId: true,
          doctorPayment: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!bill) {
    return { success: false, message: 'Patient bill not found.' };
  }
  if (bill.status === 'cancelled') {
    return { success: false, message: 'This patient bill is already cancelled.' };
  }
  if (bill.status === 'closed') {
    return { success: false, message: 'Cannot cancel a closed patient bill.' };
  }

  const activeDoctorPayment = bill.lineItems.find(
    (item) => item.doctorPaymentId && item.doctorPayment?.status !== 'cancelled'
  );
  if (activeDoctorPayment) {
    return {
      success: false,
      message:
        'Cannot cancel this bill because doctor fees have already been paid. Cancel the related doctor payment first.',
    };
  }

  const canceledAt = new Date();

  try {
    const voidedReceiptCount = await prisma.$transaction(async (tx) => {
      await tx.patientBill.update({
        where: { id: bill.id },
        data: {
          status: 'cancelled',
          cancelReason: reason,
          canceledAt,
          canceledBy: input.canceledBy ?? null,
          canceledByName: input.canceledByName ?? null,
        },
      });

      const receiptsResult = await tx.patientBillReceipt.updateMany({
        where: { billId: bill.id },
        data: {
          status: 'cancelled',
          cancelReason: reason,
          canceledAt,
          canceledBy: input.canceledBy ?? null,
          canceledByName: input.canceledByName?.trim() || null,
        },
      });

      return receiptsResult.count;
    });

    return { success: true, voidedReceiptCount };
  } catch (error) {
    console.error('cancelPatientBill failed', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to cancel patient bill.';
    if (message.includes('Unknown argument')) {
      return {
        success: false,
        message:
          'Server Prisma client is out of date. Restart the dpay dev server and try again.',
      };
    }
    return { success: false, message: 'Failed to cancel patient bill.' };
  }
}
