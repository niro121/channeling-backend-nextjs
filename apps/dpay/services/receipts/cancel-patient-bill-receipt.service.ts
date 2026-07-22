import prisma from '@/lib/prisma';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import {
  buildPaymentMethodMeta,
  validatePaymentMethodMetaMessage,
} from '@/lib/patient-bills/payment-validations';
import { validateRefundPaymentMethodMessage } from '@/lib/patient-bills/refund-method-rules';
import type { Prisma } from '@/lib/generated/prisma';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import { generateCancelReceiptNumber } from '@/services/patient-bills/generate-receipt-number.service';

/** Active payment receipts only (excludes cancelled + refund rows). */
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
  /** How the amount is being refunded (may differ from original payment method). */
  refundPaymentMethod: PatientBillPaymentMethod;
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
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
      cancelReceiptNumber: string;
    }
  | { success: false; message: string };

/**
 * Soft-cancel one patient-bill payment receipt:
 * - Creates a separate refund receipt (`{code}DPAY-REF/########`)
 * - Links original ↔ refund (cancelReceiptNumber / refundOfReceiptId)
 * - Recalculates bill from remaining active receipts
 * Blocked if already cancelled / already has a refund link / bill locked / doctor paid.
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

  const refundMetaError = validatePaymentMethodMetaMessage({
    paymentMethod: input.refundPaymentMethod,
    bank: input.bank,
    bankId: input.bankId,
    cardReference: input.cardReference,
    slipReference: input.slipReference,
    slipDate: input.slipDate,
  });
  if (refundMetaError) {
    return { success: false, message: refundMetaError };
  }

  const receipt = await prisma.patientBillReceipt.findUnique({
    where: { id: input.receiptId },
    select: {
      id: true,
      receiptNumber: true,
      amountPaid: true,
      status: true,
      cancelReceiptNumber: true,
      refundOfReceiptId: true,
      paymentMethod: true,
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
  if (receipt.refundOfReceiptId) {
    return {
      success: false,
      message: 'This is a refund receipt and cannot be cancelled.',
    };
  }
  if (receipt.status === 'cancelled' || receipt.cancelReceiptNumber) {
    return {
      success: false,
      message: receipt.cancelReceiptNumber
        ? `This receipt is already linked to refund ${receipt.cancelReceiptNumber} and cannot be cancelled again.`
        : 'This receipt is already cancelled.',
    };
  }
  if (receipt.status !== 'active') {
    return { success: false, message: 'Only active payment receipts can be cancelled.' };
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

  const refundMethodError = validateRefundPaymentMethodMessage(
    receipt.paymentMethod,
    input.refundPaymentMethod
  );
  if (refundMethodError) {
    return { success: false, message: refundMethodError };
  }

  const refundMeta = buildPaymentMethodMeta({
    paymentMethod: input.refundPaymentMethod,
    bank: input.bank,
    bankId: input.bankId,
    cardReference: input.cardReference,
    slipReference: input.slipReference,
    slipDate: input.slipDate,
  });

  const canceledAt = new Date();

  try {
    const generated = await generateCancelReceiptNumber(input.canceledBy);
    const cancelReceiptNumber = generated.receiptNumber;

    const result = await prisma.$transaction(async (tx) => {
      const refund = await tx.patientBillReceipt.create({
        data: {
          billId: receipt.billId,
          receiptNumber: cancelReceiptNumber,
          amountPaid: receipt.amountPaid,
          paymentMethod: String(input.refundPaymentMethod),
          bank: refundMeta.bank,
          bankId: refundMeta.bankId,
          cardReference: refundMeta.cardReference,
          slipReference: refundMeta.slipReference,
          slipDate: refundMeta.slipDate,
          referenceNumber: refundMeta.referenceNumber,
          locationId: generated.locationId,
          locationCode: generated.locationCode,
          locationName: generated.locationName,
          remarks: `Refund for ${receipt.receiptNumber}: ${reason}`,
          outstandingAfter: 0, // set after bill recalc below
          paymentDate: canceledAt,
          status: 'refund',
          refundOfReceiptId: receipt.id,
          cancelReason: reason,
          createdBy: input.canceledBy ?? undefined,
          createdByName: input.canceledByName?.trim() || undefined,
        },
        select: { id: true, receiptNumber: true },
      });

      await tx.patientBillReceipt.update({
        where: { id: receipt.id },
        data: {
          status: 'cancelled',
          cancelReason: reason,
          cancelReceiptNumber: refund.receiptNumber,
          canceledAt,
          canceledBy: input.canceledBy ?? null,
          canceledByName: input.canceledByName?.trim() || null,
        },
      });

      const paidAmount = await sumActiveReceiptPaidAmount(tx, receipt.billId);
      const outstandingAmount = Math.max(0, receipt.bill.totalAmount - paidAmount);
      const billStatus = computeBillPaymentStatus(paidAmount, receipt.bill.totalAmount);

      await tx.patientBillReceipt.update({
        where: { id: refund.id },
        data: { outstandingAfter: outstandingAmount },
      });

      await tx.patientBill.update({
        where: { id: receipt.billId },
        data: {
          paidAmount,
          outstandingAmount,
          status: billStatus,
          updatedBy: input.canceledBy ?? undefined,
          updatedByName: input.canceledByName?.trim() || undefined,
        },
      });

      return {
        billId: receipt.billId,
        billNumber: receipt.bill.billNumber,
        amountVoided: receipt.amountPaid,
        billStatus,
        outstandingAmount,
        cancelReceiptNumber: refund.receiptNumber,
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
