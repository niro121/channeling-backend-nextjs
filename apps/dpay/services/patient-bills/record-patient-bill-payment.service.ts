import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import prisma from '@/lib/prisma';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';
import {
  isPatientBillPaymentMethod,
  type RecordPatientBillPaymentInput,
} from '@/types/patient-bill';
import { parsePaymentSlipDate } from '@/lib/patient-bills/payment-validations';
import { isUniqueConstraintError } from '@/lib/patient-bills/sequence';
import { generateReceiptNumber } from './generate-receipt-number.service';

export type RecordPatientBillPaymentResult =
  | {
      success: true;
      receiptId: string;
      receiptNumber: string;
      receipt: {
        id: string;
        receiptNumber: string;
        amountPaid: number;
        paymentMethod: string;
        referenceNumber: string | null;
        bank: string | null;
        bankId: string | null;
        cardReference: string | null;
        slipReference: string | null;
        slipDate: string | null;
        locationId: string | null;
        locationCode: string | null;
        locationName: string | null;
        remarks: string | null;
        outstandingAfter: number;
        paymentDate: string;
        status: string;
        createdByName: string | null;
      };
    }
  | { success: false; message: string };

const MAX_NUMBER_RETRIES = 3;

function validatePaymentMeta(
  input: RecordPatientBillPaymentInput
): string | null {
  if (!isPatientBillPaymentMethod(input.paymentMethod)) {
    return 'Invalid payment method';
  }

  const method = input.paymentMethod;
  const bank = input.bank?.trim() ?? '';
  const cardDigits = (input.cardReference ?? '').replace(/\D/g, '');
  const slipReference = input.slipReference?.trim() ?? '';
  const slipDate = input.slipDate?.trim() ?? '';

  if (method === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
    if (!bank) return 'Bank is required for credit card payments';
    if (cardDigits.length !== 4) return 'Enter last 4 digits of the card';
  }

  if (method === RECEIPT_PAYMENT_METHOD.SLIP) {
    if (!bank) return 'Bank is required for slip payments';
    if (!slipReference) return 'Slip reference is required';
    if (!slipDate || !parsePaymentSlipDate(slipDate)) {
      return 'Slip date is required';
    }
  }

  if (method === RECEIPT_PAYMENT_METHOD.CHECK) {
    if (!bank) return 'Bank is required for cheque payments';
    if (!slipReference) return 'Cheque number is required';
    if (!slipDate || !parsePaymentSlipDate(slipDate)) {
      return 'Cheque date is required';
    }
  }

  if (method === RECEIPT_PAYMENT_METHOD.E_WALLET) {
    if (!input.cardReference?.trim()) {
      return 'E-wallet reference is required';
    }
  }

  return null;
}

function buildPaymentMeta(input: RecordPatientBillPaymentInput) {
  const method = input.paymentMethod;
  const bank = input.bank?.trim() || null;
  const bankId = input.bankId?.trim() || null;
  const cardReferenceRaw = input.cardReference?.trim() || null;
  const slipReference = input.slipReference?.trim() || null;
  const slipDate = parsePaymentSlipDate(input.slipDate);

  if (method === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
    return {
      bank,
      bankId,
      cardReference: (cardReferenceRaw ?? '').replace(/\D/g, '').slice(0, 4) || null,
      slipReference: null,
      slipDate: null,
      referenceNumber: null,
    };
  }

  if (method === RECEIPT_PAYMENT_METHOD.SLIP || method === RECEIPT_PAYMENT_METHOD.CHECK) {
    return {
      bank,
      bankId,
      cardReference: null,
      slipReference,
      slipDate,
      referenceNumber: null,
    };
  }

  if (method === RECEIPT_PAYMENT_METHOD.E_WALLET) {
    return {
      bank: null,
      bankId: null,
      cardReference: cardReferenceRaw,
      slipReference: null,
      slipDate: null,
      referenceNumber: null,
    };
  }

  return {
    bank: null,
    bankId: null,
    cardReference: null,
    slipReference: null,
    slipDate: null,
    referenceNumber: null,
  };
}

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

  const metaError = validatePaymentMeta(input);
  if (metaError) {
    return { success: false, message: metaError };
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

    const newPaidAmount = bill.paidAmount + amountReceived;
    const newOutstandingAmount = Math.max(0, bill.totalAmount - newPaidAmount);
    const status = computeBillPaymentStatus(newPaidAmount, bill.totalAmount);
    const providedReceiptNumber = input.receiptNumber?.trim() || null;
    const paymentMeta = buildPaymentMeta(input);

    for (let attempt = 1; attempt <= MAX_NUMBER_RETRIES; attempt++) {
      let receiptNumber: string;
      let locationId: string | null = null;
      let locationCode: string | null = null;
      let locationName: string | null = null;

      if (providedReceiptNumber) {
        receiptNumber = providedReceiptNumber;
      } else {
        const generated = await generateReceiptNumber(createdBy);
        receiptNumber = generated.receiptNumber;
        locationId = generated.locationId;
        locationCode = generated.locationCode;
        locationName = generated.locationName;
      }

      try {
        const receipt = await prisma.$transaction(async (tx) => {
          const created = await tx.patientBillReceipt.create({
            data: {
              billId: bill.id,
              receiptNumber,
              amountPaid: amountReceived,
              paymentMethod: String(input.paymentMethod),
              bank: paymentMeta.bank,
              bankId: paymentMeta.bankId,
              cardReference: paymentMeta.cardReference,
              slipReference: paymentMeta.slipReference,
              slipDate: paymentMeta.slipDate,
              referenceNumber: paymentMeta.referenceNumber,
              locationId: locationId ?? undefined,
              locationCode: locationCode ?? undefined,
              locationName: locationName ?? undefined,
              remarks: input.remarks?.trim() || null,
              outstandingAfter: newOutstandingAmount,
              status: 'active',
              createdBy: createdBy ?? undefined,
              createdByName: createdByName?.trim() || undefined,
            },
            select: {
              id: true,
              receiptNumber: true,
              amountPaid: true,
              paymentMethod: true,
              referenceNumber: true,
              bank: true,
              bankId: true,
              cardReference: true,
              slipReference: true,
              slipDate: true,
              locationId: true,
              locationCode: true,
              locationName: true,
              remarks: true,
              outstandingAfter: true,
              paymentDate: true,
              status: true,
              createdByName: true,
            },
          });

          await tx.patientBill.update({
            where: { id: bill.id },
            data: {
              paidAmount: newPaidAmount,
              outstandingAmount: newOutstandingAmount,
              status,
              updatedBy: createdBy ?? undefined,
              updatedByName: createdByName?.trim() || undefined,
            },
          });

          return created;
        });

        return {
          success: true,
          receiptId: receipt.id,
          receiptNumber: receipt.receiptNumber,
          receipt: {
            id: receipt.id,
            receiptNumber: receipt.receiptNumber,
            amountPaid: receipt.amountPaid,
            paymentMethod: receipt.paymentMethod,
            referenceNumber: receipt.referenceNumber,
            bank: receipt.bank,
            bankId: receipt.bankId,
            cardReference: receipt.cardReference,
            slipReference: receipt.slipReference,
            slipDate: receipt.slipDate?.toISOString() ?? null,
            locationId: receipt.locationId,
            locationCode: receipt.locationCode,
            locationName: receipt.locationName,
            remarks: receipt.remarks,
            outstandingAfter: receipt.outstandingAfter,
            paymentDate: receipt.paymentDate.toISOString(),
            status: receipt.status,
            createdByName: receipt.createdByName,
          },
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
