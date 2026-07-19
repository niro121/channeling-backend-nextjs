import prisma from '@/lib/prisma';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import type { Prisma } from '@/lib/generated/prisma';

/** Active receipts. Legacy rows without a status are backfilled to 'active' before summing. */
function activeReceiptsWhere(billId: string): Prisma.PatientBillReceiptWhereInput {
  return {
    billId,
    status: 'active',
  };
}

async function sumActiveReceiptPaidAmount(
  tx: Prisma.TransactionClient,
  billId: string
): Promise<number> {
  const activeReceipts = await tx.patientBillReceipt.findMany({
    where: activeReceiptsWhere(billId),
    select: { amountPaid: true },
  });
  return activeReceipts.reduce((sum, row) => sum + row.amountPaid, 0);
}

export type CancelPatientBillReceiptInput = {
  receiptId: string;
  cancelReason: string;
  canceledBy: string | null;
  canceledByName: string | null;
};

export type CancelPatientBillReceiptResult =
  | {
      success: true;
      billId: string;
      billNumber: string;
      amountVoided: number;
      billStatus: string;
      outstandingAmount: number;
    }
  | { success: false; message: string };

/**
 * Soft-cancel one patient-bill receipt and recalculate the parent bill from the
 * sum of remaining active receipts (source of truth). Blocked when the bill is
 * cancelled or doctor fees have already been paid against the bill.
 */
export async function cancelPatientBillReceipt(
  input: CancelPatientBillReceiptInput
): Promise<CancelPatientBillReceiptResult> {
  const reason = input.cancelReason?.trim() ?? '';
  if (!reason) {
    return { success: false, message: 'Cancel reason is required.' };
  }
  if (!input.receiptId?.trim()) {
    return { success: false, message: 'Receipt id is required.' };
  }

  const receipt = await prisma.patientBillReceipt.findUnique({
    where: { id: input.receiptId },
    select: {
      id: true,
      receiptNumber: true,
      amountPaid: true,
      status: true,
      billId: true,
      bill: {
        select: {
          id: true,
          billNumber: true,
          status: true,
          totalAmount: true,
          lineItems: {
            select: {
              doctorPaymentId: true,
              doctorPayment: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    return { success: false, message: 'Receipt not found.' };
  }
  if (receipt.status === 'cancelled') {
    return { success: false, message: 'This receipt is already cancelled.' };
  }
  if (receipt.bill.status === 'cancelled') {
    return {
      success: false,
      message: 'Cannot cancel a receipt on a cancelled patient bill.',
    };
  }
  if (receipt.bill.status === 'closed') {
    return {
      success: false,
      message: 'Cannot cancel a receipt on a closed patient bill.',
    };
  }

  const activeDoctorPayment = receipt.bill.lineItems.find(
    (item) => item.doctorPaymentId && item.doctorPayment?.status !== 'cancelled'
  );
  if (activeDoctorPayment) {
    return {
      success: false,
      message:
        'Cannot cancel this receipt because doctor fees have already been paid for this bill. Cancel the related doctor payment first.',
    };
  }

  const canceledAt = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.patientBillReceipt.update({
        where: { id: receipt.id },
        data: {
          status: 'cancelled',
          cancelReason: reason,
          canceledAt,
          canceledBy: input.canceledBy ?? null,
          canceledByName: input.canceledByName?.trim() || null,
        },
      });

      const paidAmount = await sumActiveReceiptPaidAmount(tx, receipt.billId);
      const outstandingAmount = Math.max(0, receipt.bill.totalAmount - paidAmount);
      const billStatus = computeBillPaymentStatus(paidAmount, receipt.bill.totalAmount);

      await tx.patientBill.update({
        where: { id: receipt.billId },
        data: {
          paidAmount,
          outstandingAmount,
          status: billStatus,
        },
      });

      return {
        billId: receipt.billId,
        billNumber: receipt.bill.billNumber,
        amountVoided: receipt.amountPaid,
        billStatus,
        outstandingAmount,
      };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('cancelPatientBillReceipt failed', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to cancel receipt.';
    if (message.includes('Unknown argument')) {
      return {
        success: false,
        message:
          'Server Prisma client is out of date. Restart the dpay dev server and try again.',
      };
    }
    return { success: false, message: 'Failed to cancel receipt.' };
  }
}
