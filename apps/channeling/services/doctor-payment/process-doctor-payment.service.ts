"use server";

import prisma from "@/lib/prisma";
import { logActivityNonBlocking } from "@/lib/activity-log";
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
  getTillBalanceBreakdownForAccount,
  getTillBalanceCentsByMethod,
} from "@/services/accounting.service";
import { getNextSequenceNumber } from "@/services/channel-booking/helpers/sequence";
import { RECEIPT_METHOD, RECEIPT_PAYMENT_METHOD } from "@/types/receipt";
import { formatCents } from "@/lib/format-money";
import { getCurrentShift, getShiftRequirementFailure } from "@/services/shift.service";
import { isShiftRequirementError, shiftRequirementMessage } from "@/lib/shift-requirement-error";
import { parseSlipDateInput } from "@/lib/slip-date";
import { resolveDoctorPaymentSplit } from "@/services/doctor-payment/split-doctor-payment.service";
import {
  logHiddenSessionMoves,
  moveNonWhtBookingsToHiddenSession,
  type HiddenSessionMoveLog,
} from "@/services/doctor-payment/move-bookings-to-hidden-session";

const JOURNAL_SEQUENCE_SCOPE = "journal";

function getWhtPercentage(): number {
  const raw = process.env.WHT_PERCENTAGE;
  if (raw == null || raw === "") return 0;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
}

const VALID_PAYMENT_METHOD_CODES = [0, 1, 2, 3, 4, 5, 6] as const;

/** Till payment methods: payment is withdrawn from cashier till (0=cash, 1=card, 2=slip, 3=check, 6=e-wallet). */
const TILL_PAYMENT_METHODS = [0, 1, 2, 3, 6] as const;

function getPaymentMethodLabel(pm: number): string {
  const labels: Record<number, string> = {
    0: "cash",
    1: "card",
    2: "slip",
    3: "cheque",
    6: "e-wallet",
  };
  return labels[pm] ?? "cash";
}

function getAllowedDoctorPaymentMethods(): number[] {
  const raw = process.env.DOCTOR_PAYMENT_METHODS;
  if (raw == null || String(raw).trim() === "") return [RECEIPT_PAYMENT_METHOD.CASH];
  return String(raw)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && (VALID_PAYMENT_METHOD_CODES as readonly number[]).includes(n));
}

export type ProcessDoctorPaymentInput = {
  bookingIds: string[];
  doctorId: string;
  paymentMethod: number;
  amount: number; // gross "Paying This Time" in rupees
  wht: boolean;
  slip_ref?: string;
  /** Slip date YYYY-MM-DD when paymentMethod is Slip */
  slip_date?: string;
  /** Credit card last 4 digits */
  card_ref?: string;
  /** E-wallet transaction reference */
  ewallet_ref?: string;
  handed_staff?: string;
  locationId: string | null;
  userId: string | null;
};

export type ProcessDoctorPaymentReceipt = {
  receiptId: string;
  receiptNoString: string;
  wht: boolean;
};

export type ProcessDoctorPaymentResult =
  | {
      success: true;
      receiptId: string;
      receiptNoString: string;
      receipts: ProcessDoctorPaymentReceipt[];
    }
  | { success: false; errorCode: string; message: string };

/**
 * Validate bookings, create one receipt (method 4), update bookings with doctor payment fields, post journal.
 */
export async function processDoctorPaymentService(
  input: ProcessDoctorPaymentInput
): Promise<ProcessDoctorPaymentResult> {
  const {
    bookingIds,
    doctorId,
    paymentMethod,
    amount,
    wht,
    slip_ref = "",
    slip_date = "",
    card_ref = "",
    ewallet_ref = "",
    handed_staff = "",
    locationId,
    userId,
  } = input;

  if (userId) {
    const shiftFailure = await getShiftRequirementFailure(userId);
    if (shiftFailure) {
      return {
        success: false,
        errorCode: shiftFailure.code,
        message: shiftFailure.code === "SHIFT_EXPIRED" ? "Shift expired" : shiftFailure.message,
      };
    }
  }

  const currentShift = userId ? await getCurrentShift(userId) : null;
  const shiftId = currentShift?.id ?? undefined;

  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return { success: false, errorCode: "VALIDATION", message: "At least one booking is required." };
  }
  if (!doctorId || typeof doctorId !== "string" || !doctorId.trim()) {
    return { success: false, errorCode: "VALIDATION", message: "Doctor is required." };
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, errorCode: "VALIDATION", message: "Amount must be a positive number." };
  }
  if (typeof paymentMethod !== "number" || !Number.isInteger(paymentMethod)) {
    return { success: false, errorCode: "VALIDATION", message: "Invalid payment method." };
  }

  const allowedMethods = getAllowedDoctorPaymentMethods();
  const methodAllowed = allowedMethods.length > 0 ? allowedMethods.includes(paymentMethod) : paymentMethod === RECEIPT_PAYMENT_METHOD.CASH;
  if (!methodAllowed) {
    return { success: false, errorCode: "VALIDATION", message: "Payment method not allowed for doctor payments." };
  }
  if (paymentMethod === RECEIPT_PAYMENT_METHOD.E_WALLET && !ewallet_ref.trim()) {
    return {
      success: false,
      errorCode: "VALIDATION",
      message: "E-wallet reference is required.",
    };
  }
  if (paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
    const last4 = card_ref.replace(/\D/g, "");
    if (last4.length !== 4) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: "Enter last 4 digits of card.",
      };
    }
  }
  if (paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP) {
    if (!slip_ref.trim()) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: "Slip reference is required.",
      };
    }
    if (!parseSlipDateInput(slip_date)) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: "Slip date is required.",
      };
    }
  }

  const existing = await prisma.booking.findMany({
    where: { id: { in: bookingIds }, doctorId },
    select: { id: true, status: true, doctorPayment: true },
  });

  if (existing.length !== bookingIds.length) {
    return { success: false, errorCode: "INVALID_BOOKINGS", message: "Some bookings not found or do not belong to this doctor." };
  }
  const alreadyPaid = existing.filter((b) => b.doctorPayment === true);
  if (alreadyPaid.length > 0) {
    return { success: false, errorCode: "ALREADY_PAID", message: "Found Already Paid Bookings." };
  }
  const notPaid = existing.filter((b) => b.status !== 1);
  if (notPaid.length > 0) {
    return { success: false, errorCode: "INVALID_STATUS", message: "All selected bookings must be paid (status 1)." };
  }

  const { findOpenApprovalForBooking } = await import("@/services/approval-request.service");
  for (const b of existing) {
    const open = await findOpenApprovalForBooking(b.id);
    if (open) {
      return {
        success: false,
        errorCode: "approval_pending",
        message: "A selected booking has an open cancel or refund request and cannot be paid to the doctor.",
      };
    }
  }

  const splitDecision = await resolveDoctorPaymentSplit({ input, shiftId });
  if (splitDecision.mode === "finished") return splitDecision.result;
  const applyWht = splitDecision.applyWht;
  const moveToHiddenBookingIds = splitDecision.moveToHiddenBookingIds ?? [];

  const whtPercentage = getWhtPercentage();
  const whtAmount = applyWht ? (amount * whtPercentage) / 100 : 0;
  const netAmount = amount - whtAmount;

  const accountsResult = await resolveDoctorPaymentAccounts({
    doctorId,
    locationId,
    createdBy: userId,
    paymentMethod,
    includeWhtPayable: applyWht && whtAmount > 0,
  });
  if ("error" in accountsResult) {
    return {
      success: false,
      errorCode: "ACCOUNTS_NOT_FOUND",
      message: accountsResult.error,
    };
  }
  const accounts = accountsResult;

  // When paying from till (cash, card, slip, check, e-wallet), ensure till has enough balance for that method
  const needTill = (TILL_PAYMENT_METHODS as readonly number[]).includes(paymentMethod);
  if (needTill && accounts.cashierAccountId) {
    const netAmountCents = Math.round(netAmount * 100);
    const breakdown = await getTillBalanceBreakdownForAccount(accounts.cashierAccountId);
    const tillBalanceCents = getTillBalanceCentsByMethod(breakdown, paymentMethod);
    if (tillBalanceCents < netAmountCents) {
      const methodLabel = getPaymentMethodLabel(paymentMethod);
      return {
        success: false,
        errorCode: "INSUFFICIENT_TILL_BALANCE",
        message:
          tillBalanceCents <= 0
            ? `Till has no ${methodLabel} balance. Cannot complete doctor payment until the till has sufficient ${methodLabel}.`
            : `Insufficient ${methodLabel} balance in till. Available: ${formatCents(tillBalanceCents)} LKR, required: ${formatCents(netAmountCents)} LKR.`,
      };
    }
  }

  const remarksBase = handed_staff.trim()
    ? `DOCTOR PAYMENT Handed: ${handed_staff.trim()}`
    : "DOCTOR PAYMENT";
  const remarks = applyWht ? remarksBase.replace("DOCTOR PAYMENT", "DOCTOR PAYMENT WHT") : remarksBase;

  const receiptParams: CreateReceiptWithoutBookingParams = {
    paymentMethod,
    amount: -1 * Math.round(amount), // Outflow: store as negative (same convention as refund)
    bank: "",
    cardReference:
      paymentMethod === RECEIPT_PAYMENT_METHOD.E_WALLET
        ? ewallet_ref.trim()
        : paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD
          ? card_ref.replace(/\D/g, "").slice(0, 4)
          : "",
    slipReference: paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP ? slip_ref : "",
    slipDate:
      paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP ? parseSlipDateInput(slip_date) : null,
    remarks,
    type: 0, // CREDIT (outflow)
    method: RECEIPT_METHOD.DOCTOR_PAYMENT,
    createdBy: userId ?? undefined,
    locationId,
    userLocationId: locationId ?? undefined,
    shiftId,
    whd: Math.round(whtAmount),
    whdPercentage: applyWht ? whtPercentage : 0,
    doctorId,
    receiptSequenceKind: applyWht ? "wht" : null,
  };

  const journalNumberResult = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 });
  const journalNumber = journalNumberResult.success ? journalNumberResult.value : 0;

  let result: Awaited<ReturnType<typeof createReceiptWithoutBooking>>;
  let hiddenMoveLogs: HiddenSessionMoveLog[] = [];
  try {
    result = await prisma.$transaction(async (tx) => {
      const r = await createReceiptWithoutBooking(tx, receiptParams);
      if (!r.success) return r;

      const journalInput = buildReceiptJournalEntryInput(r.receipt, accounts);
      if (journalInput && journalNumber > 0) {
        const jResult = await createJournalEntryInTransaction(tx, journalInput, journalNumber);
        if (!jResult.success) throw new Error(jResult.error);
      }

      await tx.booking.updateMany({
        where: { id: { in: bookingIds } },
        data: {
          doctorPayment: true,
          doctorPaymentAt: r.receipt.createdAt,
          doctorPaymentReceiptId: r.receipt.id,
          doctorPaymentReceiptString: r.receipt.receiptNoString,
        },
      });

      if (moveToHiddenBookingIds.length > 0) {
        hiddenMoveLogs = await moveNonWhtBookingsToHiddenSession(tx, {
          bookingIds: moveToHiddenBookingIds,
          doctorId,
          userId,
        });
      }

      return r;
    });
  } catch (e) {
    if (isShiftRequirementError(e)) {
      return {
        success: false,
        errorCode: e.code,
        message: shiftRequirementMessage(e),
      };
    }
    return {
      success: false,
      errorCode: "SERVER_ERROR",
      message: e instanceof Error && e.message.trim() ? e.message : "Payment failed.",
    };
  }

  if (!result.success) {
    return { success: false, errorCode: result.errorCode, message: result.message };
  }

  logHiddenSessionMoves(input.userId, hiddenMoveLogs);

  if (input.userId) {
    logActivityNonBlocking({
      userId: input.userId,
      action: "doctor-payment.batch.paid",
      entityType: "Receipt",
      entityId: result.receipt.id,
      importance: "high",
    });
  }

  return {
    success: true,
    receiptId: result.receipt.id,
    receiptNoString: result.receipt.receiptNoString,
    receipts: [
      {
        receiptId: result.receipt.id,
        receiptNoString: result.receipt.receiptNoString,
        wht: applyWht && whtAmount > 0,
      },
    ],
  };
}
