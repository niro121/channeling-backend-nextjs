import prisma from '@/lib/prisma';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import { isUniqueConstraintError } from '@/lib/patient-bills/sequence';
import type { RecordPatientBillPaymentInput } from '@/types/patient-bill';
import { generateReceiptNumber } from './generate-receipt-number.service';

export type RecordPatientBillPaymentResult =
  | { success: true; receiptId: string; receiptNumber: string }
  | { success: false; message: string };

const MAX_NUMBER_RETRIES = 3;

export async function recordPatientBillPayment(
  input: RecordPatientBillPaymentInput,
  createdBy?: string | null,
  createdByName?: string | null
): Promise<RecordPatientBillPaymentResult> {
  const amountReceived = Number(input.amountReceived);

  if (!input.billId?.trim()) {
    return { success: false, message: 'Invalid bill ID' };
  }
  if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
    return { success: false, message: 'Amount received must be greater than zero' };
  }

  try {
    const bill = await prisma.patientBill.findUnique({
      where: { id: input.billId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        outstandingAmount: true,
      },
    });

    if (!bill) {
      return { success: false, message: 'Patient bill not found' };
    }

    if (bill.status === 'cancelled') {
      return { success: false, message: 'Cannot record payment on a cancelled bill.' };
    }

    if (bill.status === 'closed') {
      return { success: false, message: 'Cannot record payment on a closed bill.' };
    }

    if (bill.status === 'draft') {
      return {
        success: false,
        message: 'Cannot record payment on a draft bill. Add doctor charges first.',
      };
    }

    if (bill.totalAmount <= 0) {
      return {
        success: false,
        message: 'Cannot record payment until doctor charges are added.',
      };
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
    const providedReceiptNumber = input.receiptNumber?.trim() || null;

    for (let attempt = 1; attempt <= MAX_NUMBER_RETRIES; attempt++) {
      const receiptNumber =
        providedReceiptNumber ?? (await generateReceiptNumber()).receiptNumber;

      try {
        const receipt = await prisma.$transaction(async (tx) => {
          const created = await tx.patientBillReceipt.create({
            data: {
              billId: bill.id,
              receiptNumber,
              amountPaid: amountReceived,
              paymentMethod: input.paymentMethod,
              referenceNumber: input.referenceNumber?.trim() || null,
              remarks: input.remarks?.trim() || null,
              outstandingAfter: newOutstandingAmount,
              status: 'active',
              createdBy: createdBy ?? undefined,
              createdByName: createdByName?.trim() || undefined,
            },
            select: { id: true, receiptNumber: true },
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

        return {
          success: true,
          receiptId: receipt.id,
          receiptNumber: receipt.receiptNumber,
        };
      } catch (error: unknown) {
        // Only retry when we generated the number ourselves.
        if (
          !providedReceiptNumber &&
          isUniqueConstraintError(error) &&
          attempt < MAX_NUMBER_RETRIES
        ) {
          continue;
        }
        throw error;
      }
    }

    return {
      success: false,
      message: 'Could not assign a unique receipt number. Please try again.',
    };
  } catch (error: unknown) {
    console.error('recordPatientBillPayment error', error);
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        message: 'This receipt number was just used. Please try saving again.',
      };
    }
    const message =
      error instanceof Error ? error.message : 'Failed to record payment';
    return { success: false, message };
  }
}
