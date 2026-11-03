import prisma from '@/lib/prisma';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import {
  buildPaymentMethodMeta,
  validatePaymentMethodMetaMessage,
} from '@/lib/patient-bills/payment-validations';
import { isUniqueConstraintError } from '@/lib/patient-bills/sequence';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import { generateOverpaymentRefundReceiptNumber } from './generate-receipt-number.service';
import { postTillJournal, requireActiveShift } from '@/lib/dpay-shift';
import { allocateRefundShares, parsePayableShares } from '@/lib/patient-bills/payable-shares';
import { activeLineItemWhere } from '@/lib/patient-bills/line-item-status';
import { isVoidablePaymentReceipt } from '@/lib/receipts/helpers';

const MAX_NUMBER_RETRIES = 3;

export type RefundOverpaidPatientBillInput = {
  billId: string;
  refundReason: string;
  refundPaymentMethod: PatientBillPaymentMethod;
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
  refundedBy: string | null;
  refundedByName: string | null;
};

export type RefundOverpaidPatientBillResult =
  | {
      success: true;
      billId: string;
      billNumber: string;
      receiptId: string;
      refundReceiptNumber: string;
      refundAmount: number;
      newPaidAmount: number;
      newOutstandingAmount: number;
      newStatus: string;
    }
  | { success: false; message: string };

export async function refundOverpaidPatientBill(
  input: RefundOverpaidPatientBillInput
): Promise<RefundOverpaidPatientBillResult> {
  const reason = input.refundReason?.trim() ?? '';
  if (!input.billId?.trim()) {
    return { success: false, message: 'Bill id is required.' };
  }
  if (!reason) {
    return { success: false, message: 'Refund reason is required.' };
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

  const paymentMeta = buildPaymentMethodMeta({
    paymentMethod: input.refundPaymentMethod,
    bank: input.bank,
    bankId: input.bankId,
    cardReference: input.cardReference,
    slipReference: input.slipReference,
    slipDate: input.slipDate,
  });

  const preview = await prisma.patientBill.findUnique({
    where: { id: input.billId },
    select: {
      paidAmount: true,
      totalAmount: true,
      lineItems: {
        where: { AND: [activeLineItemWhere] },
        select: { doctorId: true, doctorCode: true, doctorName: true, amount: true, sortOrder: true },
      },
      receipts: {
        select: {
          amountPaid: true,
          status: true,
          cancelReceiptNumber: true,
          refundOfReceiptId: true,
          payableShares: true,
        },
      },
    },
  });
  const overpaidAmount = Math.max(0, (preview?.paidAmount ?? 0) - (preview?.totalAmount ?? 0));
  const credited = (preview?.receipts ?? [])
    .filter(isVoidablePaymentReceipt)
    .flatMap((receipt) => parsePayableShares(receipt.payableShares));
  const allocated = allocateRefundShares(credited, overpaidAmount);
  if (overpaidAmount > 0 && !allocated.success) return allocated;

  const shiftGate = overpaidAmount > 0 ? await requireActiveShift(input.refundedBy) : null;
  if (shiftGate && !shiftGate.success) return { success: false, message: shiftGate.message };

  const undoOverpaymentJournal = async () => {
    if (!shiftGate?.success || !allocated.success) return true;
    const reversed = await postTillJournal({
      shift: shiftGate.shift,
      kind: 'patient_payment',
      description: 'Reverse failed DPAY overpayment refund',
      paymentMethod: input.refundPaymentMethod,
      shares: allocated.shares,
    });
    return reversed.success;
  };

  if (shiftGate?.success && allocated.success) {
    const journal = await postTillJournal({
      shift: shiftGate.shift,
      kind: 'patient_refund',
      description: `DPAY overpayment refund`,
      paymentMethod: input.refundPaymentMethod,
      shares: allocated.shares,
    });
    if (!journal.success) return { success: false, message: journal.message };
  }

  try {
    for (let attempt = 1; attempt <= MAX_NUMBER_RETRIES; attempt++) {
      const generated = await generateOverpaymentRefundReceiptNumber(input.refundedBy);

      try {
        const saved = await prisma.$transaction(async (tx): Promise<RefundOverpaidPatientBillResult> => {
          const bill = await tx.patientBill.findUnique({
            where: { id: input.billId },
            select: {
              id: true,
              billNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
            },
          });

          if (!bill) return { success: false, message: 'Patient bill not found.' };
          if (bill.status === 'cancelled') {
            return { success: false, message: 'Cannot refund a cancelled patient bill.' };
          }
          if (bill.status === 'draft') {
            return { success: false, message: 'Draft bills cannot be refunded.' };
          }

          const overpaidAmount = Math.max(0, bill.paidAmount - bill.totalAmount);
          if (overpaidAmount <= 0) {
            return {
              success: false,
              message: 'This bill is not over-paid. No refund is required.',
            };
          }

          const newPaidAmount = bill.paidAmount - overpaidAmount;
          const newOutstandingAmount = Math.max(0, bill.totalAmount - newPaidAmount);
          const newStatus = computeBillPaymentStatus(newPaidAmount, bill.totalAmount);
          const refundedAt = new Date();

          const refundReceipt = await tx.patientBillReceipt.create({
            data: {
              billId: bill.id,
              receiptNumber: generated.receiptNumber,
              amountPaid: overpaidAmount,
              paymentMethod: String(input.refundPaymentMethod),
              bank: paymentMeta.bank,
              bankId: paymentMeta.bankId,
              cardReference: paymentMeta.cardReference,
              slipReference: paymentMeta.slipReference,
              slipDate: paymentMeta.slipDate,
              referenceNumber: paymentMeta.referenceNumber,
              locationId: generated.locationId,
              locationCode: generated.locationCode,
              locationName: generated.locationName,
              remarks: `Overpayment refund: ${reason}`,
              outstandingAfter: newOutstandingAmount,
              paymentDate: refundedAt,
              status: 'refund',
              shiftId: shiftGate?.success ? shiftGate.shift.shiftId : undefined,
              payableShares: allocated.success ? allocated.shares : undefined,
              cancelReason: reason,
              createdBy: input.refundedBy ?? undefined,
              createdByName: input.refundedByName?.trim() || undefined,
            },
            select: { id: true, receiptNumber: true },
          });

          await tx.patientBill.update({
            where: { id: bill.id },
            data: {
              paidAmount: newPaidAmount,
              outstandingAmount: newOutstandingAmount,
              status: newStatus,
              updatedBy: input.refundedBy ?? undefined,
              updatedByName: input.refundedByName?.trim() || undefined,
            },
          });

          return {
            success: true as const,
            billId: bill.id,
            billNumber: bill.billNumber,
            receiptId: refundReceipt.id,
            refundReceiptNumber: refundReceipt.receiptNumber,
            refundAmount: overpaidAmount,
            newPaidAmount,
            newOutstandingAmount,
            newStatus,
          };
        });
        if (!saved.success) {
          const undone = await undoOverpaymentJournal();
          if (!undone) {
            return {
              success: false,
              message: `${saved.message} The till could not be put back. Do not retry until it is checked.`,
            };
          }
        }
        return saved;
      } catch (error: unknown) {
        if (isUniqueConstraintError(error) && attempt < MAX_NUMBER_RETRIES) {
          continue;
        }
        throw error;
      }
    }

    const undone = await undoOverpaymentJournal();
    return {
      success: false,
      message: undone
        ? 'Could not assign a unique refund receipt number. Please try again.'
        : 'Could not save the refund. The till could not be put back. Do not retry until it is checked.',
    };
  } catch (error) {
    const undone = await undoOverpaymentJournal();
    console.error('refundOverpaidPatientBill failed', error);
    return {
      success: false,
      message: undone
        ? 'Failed to refund bill overpayment.'
        : 'Failed to refund bill overpayment. The till could not be put back. Do not retry until it is checked.',
    };
  }
}
