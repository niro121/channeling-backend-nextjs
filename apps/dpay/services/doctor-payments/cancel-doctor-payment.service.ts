import prisma from '@/lib/prisma';
import {
  buildPaymentMethodMeta,
  validatePaymentMethodMetaMessage,
} from '@/lib/patient-bills/payment-validations';
import { validateRefundPaymentMethodMessage } from '@/lib/patient-bills/refund-method-rules';
import { isPatientBillPaymentMethod } from '@/types/patient-bill';
import type {
  CancelDoctorPaymentInput,
  CancelDoctorPaymentResult,
} from '@/types/doctor-payment';
import { generateDoctorPaymentCancelReceiptNumber } from './generate-doctor-payment-receipt-number.service';
import { postTillJournal, requireActiveShift } from '@/lib/dpay-shift';

/**
 * Cancel a doctor payment the same way patient bill receipts are cancelled:
 * - Creates a separate refund DoctorPayment (`{code}DPAY-REF/########`)
 * - Links original ↔ refund (cancelReceiptNumber / refundOfPaymentId)
 * - Refund method rules + bank/slip/card fields match receipt cancel
 * - Clears doctorPaymentId on linked patient bill line items
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
  if (!isPatientBillPaymentMethod(input.refundPaymentMethod)) {
    return { success: false, message: 'Invalid refund payment method.' };
  }

  const metaError = validatePaymentMethodMetaMessage({
    paymentMethod: input.refundPaymentMethod,
    bank: input.bank,
    bankId: input.bankId,
    cardReference: input.cardReference,
    slipReference: input.slipReference,
    slipDate: input.slipDate,
  });
  if (metaError) {
    return { success: false, message: metaError };
  }

  const original = await prisma.doctorPayment.findUnique({
    where: { id: input.paymentId },
    include: {
      items: true,
      lineItems: { select: { id: true } },
    },
  });

  if (!original) {
    return { success: false, message: 'Doctor payment not found.' };
  }
  if (original.refundOfPaymentId) {
    return {
      success: false,
      message: 'This is a refund receipt and cannot be cancelled.',
    };
  }
  if (original.status === 'cancelled' || original.cancelReceiptNumber) {
    return {
      success: false,
      message: original.cancelReceiptNumber
        ? `This payment is already linked to refund ${original.cancelReceiptNumber} and cannot be cancelled again.`
        : 'This doctor payment is already cancelled.',
    };
  }
  if (original.status === 'refund') {
    return {
      success: false,
      message: 'This is a refund receipt and cannot be cancelled.',
    };
  }
  if (original.status !== 'paid') {
    return { success: false, message: 'Only paid doctor payments can be cancelled.' };
  }

  const refundMethodError = validateRefundPaymentMethodMessage(
    original.paymentMethod,
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

  if (!original.doctorId?.trim() || !original.doctorCode?.trim()) {
    return {
      success: false,
      message: 'This doctor payment has no DPAY payable, so the till cannot be updated.',
    };
  }

  const shiftGate = await requireActiveShift(input.canceledBy);
  if (!shiftGate.success) return { success: false, message: shiftGate.message };

  const shares = [
    {
      doctorId: original.doctorId,
      doctorCode: original.doctorCode,
      doctorName: original.doctorName,
      amount: original.totalAmount,
    },
  ];
  const journal = await postTillJournal({
    shift: shiftGate.shift,
    kind: 'doctor_payment_cancel',
    referenceId: original.id,
    description: `DPAY doctor payment cancel ${original.receiptNumber}`,
    paymentMethod: input.refundPaymentMethod,
    shares,
    whtAmount: original.whtAmount,
  });
  if (!journal.success) return { success: false, message: journal.message };

  const lineItemIds = [
    ...new Set([
      ...original.lineItems.map((item) => item.id),
      ...original.items.flatMap((item) => item.lineItemIds),
    ]),
  ];

  try {
    const generated = await generateDoctorPaymentCancelReceiptNumber(input.canceledBy);
    const cancelReceiptNumber = generated.receiptNumber;
    const canceledAt = new Date();

    await prisma.$transaction(async (tx) => {
      const refund = await tx.doctorPayment.create({
        data: {
          receiptNumber: cancelReceiptNumber,
          doctorName: original.doctorName,
          doctorId: original.doctorId,
          doctorCode: original.doctorCode,
          shiftId: shiftGate.shift.shiftId,
          paymentMethod: String(input.refundPaymentMethod),
          referenceNumber: refundMeta.referenceNumber,
          bank: refundMeta.bank,
          bankId: refundMeta.bankId,
          cardReference: refundMeta.cardReference,
          slipReference: refundMeta.slipReference,
          slipDate: refundMeta.slipDate,
          remarks: `Refund for ${original.receiptNumber}: ${reason}`,
          locationId: generated.locationId,
          locationCode: generated.locationCode,
          locationName: generated.locationName,
          totalAmount: original.totalAmount,
          whtAmount: original.whtAmount,
          whtPercentage: original.whtPercentage,
          netAmount: original.netAmount,
          applyWht: original.applyWht,
          status: 'refund',
          refundOfPaymentId: original.id,
          createdBy: input.canceledBy ?? undefined,
          createdByName: input.canceledByName?.trim() || undefined,
          items: {
            create: original.items.map((item) => ({
              patientBillId: item.patientBillId,
              billNumber: item.billNumber,
              patientName: item.patientName,
              admissionDate: item.admissionDate,
              doctorName: item.doctorName,
              doctorFee: item.doctorFee,
              discount: item.discount,
              refund: item.refund,
              payableAmount: item.payableAmount,
              lineItemIds: item.lineItemIds,
            })),
          },
        },
        select: { id: true, receiptNumber: true },
      });

      await tx.doctorPayment.update({
        where: { id: original.id },
        data: {
          status: 'cancelled',
          cancelReason: reason,
          cancelReceiptNumber: refund.receiptNumber,
          canceledAt,
          canceledBy: input.canceledBy ?? null,
          canceledByName: input.canceledByName?.trim() || null,
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
    const reversed = await postTillJournal({
      shift: shiftGate.shift,
      kind: 'doctor_payment',
      referenceId: original.id,
      description: `Reverse failed DPAY doctor payment cancel ${original.receiptNumber}`,
      paymentMethod: input.refundPaymentMethod,
      shares,
      whtAmount: original.whtAmount,
    });
    console.error('cancelDoctorPayment failed', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to cancel doctor payment.';
    if (message.includes('Unknown argument')) {
      return {
        success: false,
        message:
          'Server Prisma client is out of date. Restart the dpay dev server and try again.',
      };
    }
    return {
      success: false,
      message: reversed.success
        ? 'Failed to cancel doctor payment.'
        : 'Failed to cancel doctor payment. The till could not be put back. Do not retry until it is checked.',
    };
  }
}
