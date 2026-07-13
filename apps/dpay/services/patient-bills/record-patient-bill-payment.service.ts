import prisma from '@/lib/prisma';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import type { RecordPatientBillPaymentInput } from '@/types/patient-bill';

export type RecordPatientBillPaymentResult =
  | { success: true; receiptId: string }
  | { success: false; message: string };

export async function recordPatientBillPayment(
  input: RecordPatientBillPaymentInput,
  createdBy?: string | null
): Promise<RecordPatientBillPaymentResult> {
  const amountReceived = Number(input.amountReceived);

  if (!input.billId?.trim()) {
    return { success: false, message: 'Invalid bill ID' };
  }
  if (!input.receiptNumber?.trim()) {
    return { success: false, message: 'Receipt number is required' };
  }
  if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
    return { success: false, message: 'Amount received must be greater than zero' };
  }

  try {
    const bill = await prisma.patientBill.findUnique({
      where: { id: input.billId },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        outstandingAmount: true,
      },
    });

    if (!bill) {
      return { success: false, message: 'Patient bill not found' };
    }

    if (amountReceived > bill.outstandingAmount) {
      return {
        success: false,
        message: `Amount cannot exceed outstanding balance of ${bill.outstandingAmount.toLocaleString('en-LK')}`,
      };
    }

    const newPaidAmount = bill.paidAmount + amountReceived;
    const newOutstandingAmount = Math.max(0, bill.totalAmount - newPaidAmount);
    const status = computeBillPaymentStatus(newPaidAmount, bill.totalAmount);

    const receipt = await prisma.$transaction(async (tx) => {
      const created = await tx.patientBillReceipt.create({
        data: {
          billId: bill.id,
          receiptNumber: input.receiptNumber.trim(),
          amountPaid: amountReceived,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber?.trim() || null,
          remarks: input.remarks?.trim() || null,
          outstandingAfter: newOutstandingAmount,
          createdBy: createdBy ?? undefined,
        },
        select: { id: true },
      });

      await tx.patientBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstandingAmount,
          status,
        },
      });

      return created;
    });

    return { success: true, receiptId: receipt.id };
  } catch (error: unknown) {
    console.error('recordPatientBillPayment error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to record payment';
    return { success: false, message };
  }
}
