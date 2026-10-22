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
import { receiptSequenceKindFromNumber } from "@/services/channel-booking/helpers/get-receipt-sequence";
import { getCurrentShift, getShiftRequirementFailure } from "@/services/shift.service";

const JOURNAL_SEQUENCE_SCOPE = "journal";

export type CancelDoctorPaymentInput = {
  receiptId: string;
  canceledBy: string;
  cancelReason: string;
};

export type CancelDoctorPaymentResult =
  | {
      success: true;
      reverseReceiptId: string;
      reverseReceiptNoString: string;
      reverseReceiptNoStrings: string[];
    }
  | { success: false; errorCode: string; message: string };

/**
 * Cancel a doctor payment (method 4): create reversal receipt (method 5), mark original canceled,
 * and clear doctor payment on all linked bookings.
 */
export async function cancelDoctorPaymentService(
  input: CancelDoctorPaymentInput
): Promise<CancelDoctorPaymentResult> {
  if (input.canceledBy) {
    const shiftFailure = await getShiftRequirementFailure(input.canceledBy);
    if (shiftFailure) {
      return {
        success: false,
        errorCode: shiftFailure.code,
        message: shiftFailure.code === "SHIFT_EXPIRED" ? "Shift expired" : shiftFailure.message,
      };
    }
  }

  const currentShift = input.canceledBy ? await getCurrentShift(input.canceledBy) : null;
  const shiftId = currentShift?.id ?? undefined;

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

  const grouped = original.doctorPaymentGroupId
    ? await prisma.receipt.findMany({
        where: {
          doctorPaymentGroupId: original.doctorPaymentGroupId,
          method: RECEIPT_METHOD.DOCTOR_PAYMENT,
        },
      })
    : [original];
  // Unset cancel fields are absent on Mongo, so a null filter would drop receipts that were never canceled.
  const originals = grouped.filter(
    (receipt) => receipt.canceledAt == null && receipt.reverseReceiptId == null
  );
  if (!originals.some((receipt) => receipt.id === original.id)) {
    originals.push(original);
  }

  const prepared: {
    original: (typeof originals)[number];
    doctorId: string;
    locationId: string;
    accounts: Awaited<ReturnType<typeof resolveDoctorPaymentAccounts>> & { error?: never };
    journalNumber: number;
    reverseParams: CreateReceiptWithoutBookingParams;
  }[] = [];

  for (const source of originals) {
    const linkedBookings = await prisma.booking.findMany({
      where: { doctorPaymentReceiptId: source.id },
      select: { id: true, doctorId: true },
    });
    const doctorId = linkedBookings[0]?.doctorId ?? source.doctorId ?? null;
    if (!doctorId) {
      return { success: false, errorCode: "INVALID", message: "No bookings linked to this doctor payment." };
    }
    const locationId = source.locationId ?? source.userLocationId;
    if (!locationId) {
      return { success: false, errorCode: "INVALID", message: "Receipt has no location." };
    }
    const accountsResult = await resolveDoctorPaymentAccounts({
      doctorId,
      locationId,
      createdBy: input.canceledBy,
      paymentMethod: source.paymentMethod,
      includeWhtPayable: (source.whd ?? 0) > 0,
    });
    if ("error" in accountsResult) {
      return { success: false, errorCode: "ACCOUNTS_NOT_FOUND", message: accountsResult.error };
    }
    const journalNumberResult = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 });
    if (!journalNumberResult.success) {
      return { success: false, errorCode: "SERVER_ERROR", message: "Failed to get a journal number." };
    }
    const whtSeries = receiptSequenceKindFromNumber(source.receiptNoString) === "wht";
    prepared.push({
      original: source,
      doctorId,
      locationId,
      accounts: accountsResult,
      journalNumber: journalNumberResult.value,
      reverseParams: {
        paymentMethod: source.paymentMethod,
        amount: -source.amount,
        bank: source.bank ?? "",
        bankId: source.bankId ?? null,
        cardReference: source.cardReference ?? "",
        slipReference: source.slipReference ?? "",
        slipDate: source.slipDate ?? null,
        remarks: `Reversal of ${source.receiptNoString}. Reason: ${reason}`,
        type: 1,
        method: RECEIPT_METHOD.DOCTOR_CANCEL,
        createdBy: input.canceledBy,
        locationId,
        userLocationId: locationId,
        shiftId,
        whd: source.whd ?? 0,
        whdPercentage: source.whdPercentage ?? 0,
        doctorId: source.doctorId ?? doctorId,
        receiptSequenceKind: whtSeries ? "wht_cancel" : null,
      },
    });
  }

  let reversals: { originalId: string; id: string; receiptNoString: string }[];
  try {
    reversals = await prisma.$transaction(async (tx) => {
      const created: { originalId: string; id: string; receiptNoString: string }[] = [];
      for (const item of prepared) {
        const r = await createReceiptWithoutBooking(tx as Pick<PrismaClient, "receipt">, item.reverseParams);
        if (!r.success) throw new Error(r.message);
        await (tx as PrismaClient).receipt.update({
          where: { id: r.receipt.id },
          data: { reversedReceiptId: item.original.id },
        });
        const journalInput = buildReceiptJournalEntryInput(r.receipt, item.accounts);
        if (journalInput) {
          const jResult = await createJournalEntryInTransaction(
            tx as unknown as AccountingTx,
            journalInput,
            item.journalNumber
          );
          if (!jResult.success) throw new Error(jResult.error ?? "Journal entry failed");
        }
        await (tx as PrismaClient).receipt.update({
          where: { id: item.original.id },
          data: {
            canceledAt: new Date(),
            canceledBy: input.canceledBy,
            cancelReason: reason,
            reverseReceiptId: r.receipt.id,
          },
        });
        await (tx as PrismaClient).booking.updateMany({
          where: { doctorPaymentReceiptId: item.original.id },
          data: {
            doctorPayment: false,
            doctorPaymentAt: null,
          },
        });
        created.push({
          originalId: item.original.id,
          id: r.receipt.id,
          receiptNoString: r.receipt.receiptNoString,
        });
      }
      return created;
    });
  } catch (e) {
    return {
      success: false,
      errorCode: "SERVER_ERROR",
      message: e instanceof Error && e.message.trim() ? e.message : "Cancel failed.",
    };
  }

  const clicked = reversals.find((row) => row.originalId === input.receiptId) ?? reversals[0];
  if (!clicked) {
    return { success: false, errorCode: "SERVER_ERROR", message: "Cancel failed." };
  }
  return {
    success: true,
    reverseReceiptId: clicked.id,
    reverseReceiptNoString: clicked.receiptNoString,
    reverseReceiptNoStrings: reversals.map((row) => row.receiptNoString),
  };
}
