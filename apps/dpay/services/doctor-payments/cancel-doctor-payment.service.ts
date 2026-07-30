import prisma from '@/lib/prisma';
import { generateDoctorPaymentCancelReceiptNumber } from './generate-doctor-payment-receipt-number.service';

export type CancelDoctorPaymentInput = {
  paymentId: string;
  cancelReason: string;
  canceledBy: string | null;
  canceledByName: string | null;
};

export type CancelDoctorPaymentResult =
  | { success: true; cancelReceiptNumber: string }
  | { success: false; message: string };

/**
 * Cancel a doctor payment: mark as cancelled, store reverse receipt no.,
 * and clear doctorPaymentId on linked patient bill line items so they can be paid again.
 */
export async function cancelDoctorPayment(
  input: CancelDoctorPaymentInput
): Promise<CancelDoctorPaymentResult> {
  const reason = input.cancelReason?.trim() ?? '';
  if (!reason) {
    return { success: false, message: 'Cancel reason is required.' };
  }
  if (!input.paymentId?.trim()) {
    return { success: false, message: 'Payment id is required.' };
  }

  const original = await prisma.doctorPayment.findUnique({
    where: { id: input.paymentId },
    select: {
      id: true,
      status: true,
      receiptNumber: true,
      lineItems: { select: { id: true } },
      items: { select: { lineItemIds: true } },
    },
  });

  if (!original) {
    return { success: false, message: 'Doctor payment not found.' };
  }
  if (original.status === 'cancelled') {
    return { success: false, message: 'This doctor payment is already cancelled.' };
  }

  const lineItemIds = [
    ...new Set([
      ...original.lineItems.map((item) => item.id),
      ...original.items.flatMap((item) => item.lineItemIds),
    ]),
  ];

  try {
    const generated = await generateDoctorPaymentCancelReceiptNumber(input.canceledBy);
    const cancelReceiptNumber = generated.receiptNumber;

    await prisma.$transaction(async (tx) => {
      await tx.doctorPayment.update({
        where: { id: original.id },
        data: {
          status: 'cancelled',
          cancelReason: reason,
          cancelReceiptNumber,
          canceledAt: new Date(),
          canceledBy: input.canceledBy ?? null,
          canceledByName: input.canceledByName ?? null,
        },
      });

      if (lineItemIds.length > 0) {
        await tx.patientBillItem.updateMany({
          where: {
            OR: [{ id: { in: lineItemIds } }, { doctorPaymentId: original.id }],
          },
          data: {
            doctorPaymentId: null,
            doctorPaidAt: null,
          },
        });
      } else {
        await tx.patientBillItem.updateMany({
          where: { doctorPaymentId: original.id },
          data: {
            doctorPaymentId: null,
            doctorPaidAt: null,
          },
        });
      }
    });

    return { success: true, cancelReceiptNumber };
  } catch (error) {
    console.error('cancelDoctorPayment failed', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to cancel doctor payment.';
    // Surface Prisma validation messages in a shorter form for the toast
    if (message.includes('Unknown argument')) {
      return {
        success: false,
        message:
          'Server Prisma client is out of date. Restart the dpay dev server and try again.',
      };
    }
    return { success: false, message: 'Failed to cancel doctor payment.' };
  }
}
