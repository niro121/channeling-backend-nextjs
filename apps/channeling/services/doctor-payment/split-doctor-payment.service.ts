import { randomBytes } from "node:crypto"
import prisma from "@/lib/prisma"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { planDoctorPaymentWhtSplit, type WhtSplitBooking } from "@/lib/doctor-payment-wht-split"
import {
  logHiddenSessionMoves,
  moveNonWhtBookingsToHiddenSession,
} from "@/services/doctor-payment/move-bookings-to-hidden-session"
import {
  createReceiptWithoutBooking,
  type CreateReceiptWithoutBookingParams,
} from "@/services/channel-booking/helpers/create-receipt-for-booking"
import {
  buildReceiptJournalEntryInput,
  resolveDoctorPaymentAccounts,
} from "@/services/channel-booking/helpers/receipt-journal-entry"
import {
  createJournalEntryInTransaction,
  getTillBalanceBreakdownForAccount,
  getTillBalanceCentsByMethod,
} from "@/services/accounting.service"
import { getNextSequenceNumber } from "@/services/channel-booking/helpers/sequence"
import { RECEIPT_METHOD, RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import { formatCents } from "@/lib/format-money"
import { isShiftRequirementError, shiftRequirementMessage } from "@/lib/shift-requirement-error"
import { parseSlipDateInput } from "@/lib/slip-date"
import type {
  ProcessDoctorPaymentInput,
  ProcessDoctorPaymentResult,
} from "@/services/doctor-payment/process-doctor-payment.service"

const JOURNAL_SEQUENCE_SCOPE = "journal"
const TILL_PAYMENT_METHODS = [0, 1, 2, 3, 6] as const

function getWhtTaxPercentage(): number {
  const raw = process.env.WHT_PERCENTAGE
  if (raw == null || raw === "") return 0
  const n = parseFloat(raw)
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n))
}

function paymentMethodLabel(pm: number): string {
  const labels: Record<number, string> = {
    0: "cash",
    1: "card",
    2: "slip",
    3: "cheque",
    6: "e-wallet",
  }
  return labels[pm] ?? "cash"
}

function sumRs(rows: WhtSplitBooking[]): number {
  return rows.reduce((sum, row) => sum + row.paymentRs, 0)
}

async function loadSplitBookings(bookingIds: string[]): Promise<WhtSplitBooking[]> {
  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    select: {
      id: true,
      appointmentNo: true,
      sessionStartTime: true,
      professionalFee: true,
      professionsalFeeDiscount: true,
      refundAmountProfessionalFee: true,
      session: { select: { date: true, startTime: true } },
    },
  })
  return bookings.map((b) => {
    const sessionDate = b.session?.date ? new Date(b.session.date) : new Date(0)
    const sessionStart = b.session?.startTime
      ? new Date(b.session.startTime)
      : new Date((b.sessionStartTime ?? 0) * 1000)
    const paymentRs = Math.max(
      0,
      (b.professionalFee ?? 0) - (b.professionsalFeeDiscount ?? 0) - (b.refundAmountProfessionalFee ?? 0)
    )
    return {
      id: b.id,
      paymentRs,
      sessionDateMs: sessionDate.getTime(),
      sessionStartMs: sessionStart.getTime(),
      appointmentNo: b.appointmentNo,
    }
  })
}

export type DoctorPaymentSplitDecision =
  | { mode: "single"; applyWht: boolean; moveToHiddenBookingIds?: string[] }
  | { mode: "finished"; result: ProcessDoctorPaymentResult }

/**
 * Tick on: one receipt with WHT on the full amount. Bookings stay where they are.
 * Tick off: split by the doctor's WHT percentage.
 * A percentage of 0, or a share below one whole booking, is one receipt without WHT
 * and every selected booking moves to the hidden session.
 */
export async function resolveDoctorPaymentSplit(args: {
  input: ProcessDoctorPaymentInput
  shiftId?: string
}): Promise<DoctorPaymentSplitDecision> {
  const { input, shiftId } = args
  if (input.wht) return { mode: "single", applyWht: true }

  const doctor = await prisma.doctor.findUnique({
    where: { id: input.doctorId },
    select: { whtPercentage: true },
  })
  const share = Math.max(0, Math.min(100, doctor?.whtPercentage ?? 0))

  const rows = await loadSplitBookings(input.bookingIds)
  if (rows.length !== input.bookingIds.length) {
    return {
      mode: "finished",
      result: {
        success: false,
        errorCode: "INVALID_BOOKINGS",
        message: "Some bookings not found or do not belong to this doctor.",
      },
    }
  }

  const planned = planDoctorPaymentWhtSplit(rows, share)
  if (planned.whtCount <= 0) {
    return {
      mode: "single",
      applyWht: false,
      moveToHiddenBookingIds: rows.map((row) => row.id),
    }
  }
  if (planned.whtCount >= rows.length) return { mode: "single", applyWht: true }

  const result = await executeSplitDoctorPayment({
    whtRows: planned.wht,
    restRows: planned.rest,
    input,
    shiftId,
  })
  return { mode: "finished", result }
}

async function executeSplitDoctorPayment(args: {
  whtRows: WhtSplitBooking[]
  restRows: WhtSplitBooking[]
  input: ProcessDoctorPaymentInput
  shiftId?: string
}): Promise<ProcessDoctorPaymentResult> {
  const { whtRows, restRows, input, shiftId } = args
  const amountA = sumRs(whtRows)
  const amountB = sumRs(restRows)
  if (amountA <= 0 || amountB <= 0) {
    return {
      success: false,
      errorCode: "VALIDATION",
      message: "Each side of the WHT split must have an amount to pay.",
    }
  }
  if (Math.round(input.amount) !== Math.round(amountA + amountB)) {
    return {
      success: false,
      errorCode: "VALIDATION",
      message: "A split payment pays the full amount of the selected bookings.",
    }
  }

  const taxPercentage = getWhtTaxPercentage()
  const whtAmount = Math.round((amountA * taxPercentage) / 100)
  const netLeavingTill = amountA - whtAmount + amountB

  const accountsResult = await resolveDoctorPaymentAccounts({
    doctorId: input.doctorId,
    locationId: input.locationId,
    createdBy: input.userId,
    paymentMethod: input.paymentMethod,
    includeWhtPayable: whtAmount > 0,
  })
  if ("error" in accountsResult) {
    return { success: false, errorCode: "ACCOUNTS_NOT_FOUND", message: accountsResult.error }
  }

  const needTill = (TILL_PAYMENT_METHODS as readonly number[]).includes(input.paymentMethod)
  if (needTill && accountsResult.cashierAccountId) {
    const requiredCents = Math.round(netLeavingTill * 100)
    const breakdown = await getTillBalanceBreakdownForAccount(accountsResult.cashierAccountId)
    const tillBalanceCents = getTillBalanceCentsByMethod(breakdown, input.paymentMethod)
    if (tillBalanceCents < requiredCents) {
      const methodLabel = paymentMethodLabel(input.paymentMethod)
      return {
        success: false,
        errorCode: "INSUFFICIENT_TILL_BALANCE",
        message:
          tillBalanceCents <= 0
            ? `Till has no ${methodLabel} balance. Cannot complete doctor payment until the till has sufficient ${methodLabel}.`
            : `Insufficient ${methodLabel} balance in till. Available: ${formatCents(tillBalanceCents)} LKR, required: ${formatCents(requiredCents)} LKR.`,
      }
    }
  }

  const handed = input.handed_staff?.trim() ?? ""
  const baseRemarks = handed ? `DOCTOR PAYMENT Handed: ${handed}` : "DOCTOR PAYMENT"
  const groupId = randomBytes(12).toString("hex")
  const slipDate =
    input.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP ? parseSlipDateInput(input.slip_date ?? "") : null

  const shared = {
    paymentMethod: input.paymentMethod,
    bank: "",
    cardReference:
      input.paymentMethod === RECEIPT_PAYMENT_METHOD.E_WALLET
        ? (input.ewallet_ref ?? "").trim()
        : input.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD
          ? (input.card_ref ?? "").replace(/\D/g, "").slice(0, 4)
          : "",
    slipReference: input.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP ? input.slip_ref ?? "" : "",
    slipDate,
    type: 0,
    method: RECEIPT_METHOD.DOCTOR_PAYMENT,
    createdBy: input.userId ?? undefined,
    locationId: input.locationId,
    userLocationId: input.locationId ?? undefined,
    shiftId,
    doctorId: input.doctorId,
    doctorPaymentGroupId: groupId,
  }

  const whtParams: CreateReceiptWithoutBookingParams = {
    ...shared,
    amount: -1 * Math.round(amountA),
    remarks: baseRemarks.replace("DOCTOR PAYMENT", "DOCTOR PAYMENT WHT"),
    whd: whtAmount,
    whdPercentage: taxPercentage,
    receiptSequenceKind: "wht",
  }
  const restParams: CreateReceiptWithoutBookingParams = {
    ...shared,
    amount: -1 * Math.round(amountB),
    remarks: baseRemarks,
    whd: 0,
    whdPercentage: 0,
  }

  const journalA = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 })
  const journalB = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 })
  if (!journalA.success || !journalB.success) {
    return { success: false, errorCode: "SERVER_ERROR", message: "Failed to get journal numbers." }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const whtReceipt = await createReceiptWithoutBooking(tx, whtParams)
      if (!whtReceipt.success) throw new Error(whtReceipt.message)
      const restReceipt = await createReceiptWithoutBooking(tx, restParams)
      if (!restReceipt.success) throw new Error(restReceipt.message)

      const whtJournal = buildReceiptJournalEntryInput(whtReceipt.receipt, accountsResult)
      const restJournal = buildReceiptJournalEntryInput(restReceipt.receipt, accountsResult)
      if (!whtJournal || !restJournal) {
        throw new Error("Could not build the doctor payment journal.")
      }
      const postedWht = await createJournalEntryInTransaction(tx, whtJournal, journalA.value)
      if (!postedWht.success) throw new Error(postedWht.error)
      const postedRest = await createJournalEntryInTransaction(tx, restJournal, journalB.value)
      if (!postedRest.success) throw new Error(postedRest.error)

      await tx.booking.updateMany({
        where: { id: { in: whtRows.map((row) => row.id) } },
        data: {
          doctorPayment: true,
          doctorPaymentAt: whtReceipt.receipt.createdAt,
          doctorPaymentReceiptId: whtReceipt.receipt.id,
          doctorPaymentReceiptString: whtReceipt.receipt.receiptNoString,
        },
      })
      await tx.booking.updateMany({
        where: { id: { in: restRows.map((row) => row.id) } },
        data: {
          doctorPayment: true,
          doctorPaymentAt: restReceipt.receipt.createdAt,
          doctorPaymentReceiptId: restReceipt.receipt.id,
          doctorPaymentReceiptString: restReceipt.receipt.receiptNoString,
        },
      })

      const moveLogs = await moveNonWhtBookingsToHiddenSession(tx, {
        bookingIds: restRows.map((row) => row.id),
        doctorId: input.doctorId,
        userId: input.userId,
      })

      return { whtReceipt: whtReceipt.receipt, restReceipt: restReceipt.receipt, moveLogs }
    })

    logHiddenSessionMoves(input.userId, created.moveLogs)

    if (input.userId) {
      for (const receipt of [created.whtReceipt, created.restReceipt]) {
        logActivityNonBlocking({
          userId: input.userId,
          action: "doctor-payment.batch.paid",
          entityType: "Receipt",
          entityId: receipt.id,
          importance: "high",
        })
      }
    }

    return {
      success: true,
      receiptId: created.whtReceipt.id,
      receiptNoString: created.whtReceipt.receiptNoString,
      receipts: [
        { receiptId: created.whtReceipt.id, receiptNoString: created.whtReceipt.receiptNoString, wht: true },
        { receiptId: created.restReceipt.id, receiptNoString: created.restReceipt.receiptNoString, wht: false },
      ],
    }
  } catch (e) {
    if (isShiftRequirementError(e)) {
      return { success: false, errorCode: e.code, message: shiftRequirementMessage(e) }
    }
    return {
      success: false,
      errorCode: "SERVER_ERROR",
      message: e instanceof Error && e.message.trim() ? e.message : "Payment failed.",
    }
  }
}
