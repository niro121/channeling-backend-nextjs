import prisma from '@/lib/prisma';
import { isDeletedLineItem, normalizeLineItemStatus } from '@/lib/patient-bills/line-item-status';
import {
  buildPaymentMethodMeta,
  validatePaymentMethodMetaMessage,
} from '@/lib/patient-bills/payment-validations';
import { validateRefundPaymentMethodForReceiptsMessage } from '@/lib/patient-bills/refund-method-rules';
import { isVoidablePaymentReceipt } from '@/lib/receipts/helpers';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import { generateCancelReceiptNumber } from '@/services/patient-bills/generate-receipt-number.service';

export type CancelPatientBillInput = {
  billId: string;
  cancelReason: string;
  /** Required when the bill has active payment receipts to void. */
  refundPaymentMethod?: PatientBillPaymentMethod;
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
  canceledBy: string | null;
  canceledByName: string | null;
};

export type CancelPatientBillResult =
  | { success: true; voidedReceiptCount: number; previousStatus: string }
  | { success: false; message: string };

/**
 * Soft-cancel a patient bill (including closed) and void all active payment receipts.
 * Each active receipt gets a separate refund receipt (`{code}DPAY-REF/########`)
 * linked via cancelReceiptNumber / refundOfReceiptId (same as single-receipt cancel).
 * Refund method is chosen by the user (may differ from original payment methods).
 * Closed bills stay non-editable — cancel is the supported reversal path.
 * Blocked when any line item is still linked to a non-cancelled doctor payment.
 * Single-receipt cancel remains blocked on closed bills (use full bill cancel instead).
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
      totalAmount: true,
      lineItems: {
        select: {
          id: true,
          status: true,
          doctorPaymentId: true,
          doctorPayment: { select: { id: true, status: true } },
        },
      },
      // Load all receipts; filter voidable ones in memory. Prisma Mongo `field: null`
      // does not reliably match documents where cancel/refund fields were never set.
      receipts: {
        select: {
          id: true,
          receiptNumber: true,
          amountPaid: true,
          paymentMethod: true,
          status: true,
          cancelReceiptNumber: true,
          refundOfReceiptId: true,
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

  const activeDoctorPayment = bill.lineItems.find(
    (item) =>
      !isDeletedLineItem({ status: normalizeLineItemStatus(item.status) }) &&
      item.doctorPaymentId &&
      item.doctorPayment?.status === 'paid'
  );
  if (activeDoctorPayment) {
    return {
      success: false,
      message:
        'Cannot cancel this bill because doctor fees have already been paid. Cancel the related doctor payment first.',
    };
  }

  const activeReceipts = bill.receipts.filter(isVoidablePaymentReceipt);

  let refundMeta: ReturnType<typeof buildPaymentMethodMeta> | null = null;
  if (activeReceipts.length > 0) {
    if (input.refundPaymentMethod == null) {
      return {
        success: false,
        message: 'Refund method is required when cancelling a bill with payments.',
      };
    }
    const refundMethodError = validateRefundPaymentMethodForReceiptsMessage(
      activeReceipts.map((r) => r.paymentMethod),
      input.refundPaymentMethod
    );
    if (refundMethodError) {
      return { success: false, message: refundMethodError };
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
    refundMeta = buildPaymentMethodMeta({
      paymentMethod: input.refundPaymentMethod,
      bank: input.bank,
      bankId: input.bankId,
      cardReference: input.cardReference,
      slipReference: input.slipReference,
      slipDate: input.slipDate,
    });
  }

  const canceledAt = new Date();
  const outstandingAfterCancel = bill.totalAmount;

  try {
    const refundNumbers = await Promise.all(
      activeReceipts.map(() => generateCancelReceiptNumber(input.canceledBy))
    );

    const voidedReceiptCount = await prisma.$transaction(async (tx) => {
      await tx.patientBill.update({
        where: { id: bill.id },
        data: {
          status: 'cancelled',
          paidAmount: 0,
          outstandingAmount: outstandingAfterCancel,
          cancelReason: reason,
          canceledAt,
          canceledBy: input.canceledBy ?? null,
          canceledByName: input.canceledByName ?? null,
          updatedBy: input.canceledBy ?? undefined,
          updatedByName: input.canceledByName ?? undefined,
        },
      });

      for (let i = 0; i < activeReceipts.length; i++) {
        const receipt = activeReceipts[i];
        const generated = refundNumbers[i];
        const meta = refundMeta!;

        await tx.patientBillReceipt.create({
          data: {
            billId: bill.id,
            receiptNumber: generated.receiptNumber,
            amountPaid: receipt.amountPaid,
            paymentMethod: String(input.refundPaymentMethod),
            bank: meta.bank,
            bankId: meta.bankId,
            cardReference: meta.cardReference,
            slipReference: meta.slipReference,
            slipDate: meta.slipDate,
            referenceNumber: meta.referenceNumber,
            locationId: generated.locationId,
            locationCode: generated.locationCode,
            locationName: generated.locationName,
            remarks: `Refund for ${receipt.receiptNumber}: ${reason}`,
            outstandingAfter: outstandingAfterCancel,
            paymentDate: canceledAt,
            status: 'refund',
            refundOfReceiptId: receipt.id,
            cancelReason: reason,
            createdBy: input.canceledBy ?? undefined,
            createdByName: input.canceledByName?.trim() || undefined,
          },
        });

        await tx.patientBillReceipt.update({
          where: { id: receipt.id },
          data: {
            status: 'cancelled',
            cancelReason: reason,
            cancelReceiptNumber: generated.receiptNumber,
            canceledAt,
            canceledBy: input.canceledBy ?? null,
            canceledByName: input.canceledByName?.trim() || null,
          },
        });
      }

      return activeReceipts.length;
    });

    return { success: true, voidedReceiptCount, previousStatus: bill.status };
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
