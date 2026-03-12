"use server";

import type { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";
import { RECEIPT_METHOD } from "@/types/receipt";
import {
  createReceiptWithoutBooking,
  type CreateReceiptWithoutBookingParams,
} from "@/services/channel-booking/helpers/create-receipt-for-booking";
import {
  buildReceiptJournalEntryInput,
  resolveDoctorPaymentAccounts,
} from "@/services/channel-booking/helpers/receipt-journal-entry";
import {
  createJournalEntryInTransaction,
  type AccountingTx,
} from "@/services/accounting.service";
import { getNextSequenceNumber } from "@/services/channel-booking/helpers/sequence";
import { requireActiveShift } from "@/services/shift.service";

const JOURNAL_SEQUENCE_SCOPE = "journal";

export type CancelDoctorPaymentInput = {
  receiptId: string;
  canceledBy: string;
  cancelReason: string;
};

export type CancelDoctorPaymentResult =
  | { success: true; reverseReceiptId: string; reverseReceiptNoString: string }
  | { success: false; errorCode: string; message: string };

/**
 * Cancel a doctor payment (method 4): create reversal receipt (method 5), mark original canceled,
 * and clear doctor payment on all linked bookings.
 */
export async function cancelDoctorPaymentService(
  input: CancelDoctorPaymentInput
): Promise<CancelDoctorPaymentResult> {
  if (input.canceledBy) await requireActiveShift(input.canceledBy);

  const reason = input.cancelReason?.trim() ?? "";
  if (!reason) {
    return { success: false, errorCode: "VALIDATION", message: "Cancel reason is required." };
  }

  const original = await prisma.receipt.findUnique({
    where: { id: input.receiptId },
  });

  if (!original) {
    return { success: false, errorCode: "NOT_FOUND", message: "Receipt not found." };
  }
  if (original.method !== RECEIPT_METHOD.DOCTOR_PAYMENT) {
    return { success: false, errorCode: "INVALID", message: "Only doctor payment receipts can be canceled." };
  }
  if (original.canceledAt != null || original.reverseReceiptId != null) {
    return { success: false, errorCode: "ALREADY_CANCELED", message: "This doctor payment is already canceled." };
  }

  const linkedBookings = await prisma.booking.findMany({
    where: { doctorPaymentReceiptId: input.receiptId },
    select: { id: true, doctorId: true },
  });
  const doctorId = linkedBookings[0]?.doctorId ?? null;
  if (!doctorId) {
    return { success: false, errorCode: "INVALID", message: "No bookings linked to this doctor payment." };
  }

  const locationId = original.locationId ?? original.userLocationId;
  if (!locationId) {
    return { success: false, errorCode: "INVALID", message: "Receipt has no location." };
  }

  const accountsResult = await resolveDoctorPaymentAccounts({
    doctorId,
    locationId,
    createdBy: input.canceledBy,
    paymentMethod: original.paymentMethod,
  });
  if ("error" in accountsResult) {
    return {
      success: false,
      errorCode: "ACCOUNTS_NOT_FOUND",
      message: accountsResult.error,
    };
  }
  const accounts = accountsResult;

  const reverseAmount = -original.amount;
  const reversalRemarks = `Reversal of ${original.receiptNoString}. Reason: ${reason}`;

  const reverseParams: CreateReceiptWithoutBookingParams = {
    paymentMethod: original.paymentMethod,
    amount: reverseAmount,
    bank: original.bank ?? "",
    bankId: original.bankId ?? null,
    cardReference: original.cardReference ?? "",
    slipReference: original.slipReference ?? "",
    remarks: reversalRemarks,
    type: 1, // DEBIT (inflow for reversal)
    method: RECEIPT_METHOD.DOCTOR_CANCEL,
    createdBy: input.canceledBy,
    locationId,
    userLocationId: locationId,
    whd: original.whd ?? 0,
    whdPercentage: original.whdPercentage ?? 0,
  };

  const journalNumberResult = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 });
  const journalNumber = journalNumberResult.success ? journalNumberResult.value : 0;

  const result = await prisma.$transaction(async (tx) => {
    const r = await createReceiptWithoutBooking(
      tx as Pick<PrismaClient, "receipt">,
      reverseParams
    );
    if (!r.success) return r;

    await (tx as PrismaClient).receipt.update({
      where: { id: r.receipt.id },
      data: { reversedReceiptId: input.receiptId },
    });

    const journalInput = buildReceiptJournalEntryInput(r.receipt, accounts);
    if (journalInput && journalNumber > 0) {
      const jResult = await createJournalEntryInTransaction(
        tx as unknown as AccountingTx,
        journalInput,
        journalNumber
      );
      if (!jResult.success) throw new Error(jResult.error ?? "Journal entry failed");
    }

    await (tx as PrismaClient).receipt.update({
      where: { id: input.receiptId },
      data: {
        canceledAt: new Date(),
        canceledBy: input.canceledBy,
        cancelReason: reason,
        reverseReceiptId: r.receipt.id,
      },
    });

    await (tx as PrismaClient).booking.updateMany({
      where: { doctorPaymentReceiptId: input.receiptId },
      data: {
        doctorPayment: false,
        doctorPaymentAt: null,
        doctorPaymentReceiptId: null,
        doctorPaymentReceiptString: null,
      },
    });

    return { success: true as const, receipt: r.receipt };
  });

  if (!result.success) {
    const failed = result as { success: false; errorCode?: string; message?: string };
    return {
      success: false,
      errorCode: failed.errorCode ?? "SERVER",
      message: failed.message ?? "Cancel failed.",
    };
  }

  const receipt = (result as { success: true; receipt: { id: string; receiptNoString: string } })
    .receipt;

  return {
    success: true,
    reverseReceiptId: receipt.id,
    reverseReceiptNoString: receipt.receiptNoString,
  };
}
