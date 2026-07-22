import prisma from '@/lib/prisma';
import {
  DOCTOR_PAYMENT_METHODS,
  DOCTOR_PAYMENT_WHT_PERCENTAGE,
  type ProcessDoctorPaymentInput,
  type ProcessDoctorPaymentResult,
} from '@/types/doctor-payment';
import { generateDoctorPaymentReceiptNumber } from './generate-doctor-payment-receipt-number.service';
import { getEligibleBillsForDoctor } from './get-eligible-bills.service';

const VALID_METHODS = new Set(DOCTOR_PAYMENT_METHODS.map((m) => m.value));

export async function processDoctorPayment(
  input: ProcessDoctorPaymentInput,
  createdBy: string | null,
  createdByName: string | null
): Promise<ProcessDoctorPaymentResult> {
  const doctorName = input.doctorName?.trim();
  if (!doctorName) {
    return { success: false, message: 'Doctor is required.' };
  }
  if (!Array.isArray(input.billIds) || input.billIds.length === 0) {
    return { success: false, message: 'Select at least one bill.' };
  }
  if (!VALID_METHODS.has(input.paymentMethod)) {
    return { success: false, message: 'Invalid payment method.' };
  }

  const needsReference =
    input.paymentMethod === 'bank_transfer' ||
    input.paymentMethod === 'cheque' ||
    input.paymentMethod === 'online_transfer';
  if (needsReference && !input.referenceNumber?.trim()) {
    return { success: false, message: 'Reference number is required for this payment method.' };
  }

  const eligible = await getEligibleBillsForDoctor(doctorName);
  const eligibleById = new Map(eligible.map((row) => [row.billId, row]));
  const selected: typeof eligible = [];

  for (const billId of input.billIds) {
    const row = eligibleById.get(billId);
    if (!row) {
      return {
        success: false,
        message: 'One or more selected bills are no longer eligible for payment.',
      };
    }
    selected.push(row);
  }

  const totalAmount = selected.reduce((sum, row) => sum + row.payableAmount, 0);
  if (totalAmount <= 0) {
    return { success: false, message: 'Payable amount must be greater than zero.' };
  }

  const applyWht = Boolean(input.applyWht);
  const whtPercentage = applyWht ? DOCTOR_PAYMENT_WHT_PERCENTAGE : 0;
  const whtAmount = applyWht
    ? Math.round(((totalAmount * whtPercentage) / 100) * 100) / 100
    : 0;
  const netAmount = Math.round((totalAmount - whtAmount) * 100) / 100;

  const allLineItemIds = selected.flatMap((row) => row.lineItemIds);

  try {
    const generated = await generateDoctorPaymentReceiptNumber(createdBy);
    const receiptNumber = generated.receiptNumber;

    const payment = await prisma.$transaction(async (tx) => {
      const stillFree = await tx.patientBillItem.count({
        where: {
          id: { in: allLineItemIds },
          OR: [{ doctorPaymentId: null }, { doctorPaymentId: { isSet: false } }],
        },
      });

      if (stillFree !== allLineItemIds.length) {
        throw new Error('ALREADY_PAID');
      }

      const created = await tx.doctorPayment.create({
        data: {
          receiptNumber,
          doctorName,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber?.trim() || null,
          remarks: input.remarks?.trim() || null,
          locationId: generated.locationId,
          locationCode: generated.locationCode,
          totalAmount,
          whtAmount,
          whtPercentage,
          netAmount,
          applyWht,
          status: 'paid',
          createdBy: createdBy ?? undefined,
          createdByName: createdByName ?? undefined,
          items: {
            create: selected.map((row) => ({
              patientBillId: row.billId,
              billNumber: row.billNumber,
              patientName: row.patientName,
              admissionDate: new Date(row.admissionDate),
              doctorName: row.doctorName,
              doctorFee: row.doctorFee,
              discount: row.discount,
              refund: row.refund,
              payableAmount: row.payableAmount,
              lineItemIds: row.lineItemIds,
            })),
          },
        },
      });

      await tx.patientBillItem.updateMany({
        where: { id: { in: allLineItemIds } },
        data: {
          doctorPaymentId: created.id,
          doctorPaidAt: new Date(),
        },
      });

      return created;
    });

    return {
      success: true,
      receiptNumber: payment.receiptNumber,
      paymentId: payment.id,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_PAID') {
      return {
        success: false,
        message: 'One or more selected bills were already paid to the doctor.',
      };
    }
    console.error('processDoctorPayment failed', error);
    return { success: false, message: 'Failed to process doctor payment.' };
  }
}
