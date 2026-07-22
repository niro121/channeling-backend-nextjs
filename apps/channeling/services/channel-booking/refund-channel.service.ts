import prisma from "@/lib/prisma"
import {
  createReceiptAndUpdateBooking,
  getBookingForSaveBooking,
  getNextSequenceNumber,
  buildReceiptJournalEntryInput,
  isResolveReceiptJournalAccountsError,
  resolveReceiptJournalAccounts,
  requireReceiptJournalAccounts,
  resolveReceiptLocationId,
} from "./helpers"
import {
  createJournalEntryInTransaction,
  getTillBalanceBreakdownForAccount,
  getTillBalanceCentsByMethod,
} from "@/services/accounting.service"
import { formatCents } from "@/lib/format-money"
import { getIO, floatBalanceRoom } from "@/lib/socket-server"
import { requireActiveShift, getCurrentShift } from "@/services/shift.service"
import { isShiftRequirementError } from "@/lib/shift-requirement-error"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"
import type { ReceiptPaymentLineDraft } from "./helpers/create-receipt-for-booking"
import { formatSlipDate, parseSlipDateInput } from "@/lib/slip-date"

/** refund_type: 0 = Cancel (full or no refund), 1 = Refund (partial) */
export type RefundChannelInput = {
  booking_id: string
  refund_type: number
  professional_fee: number
  hospital_fee: number
  /** 0 Cash, 1 Card, 2 Slip, 3 Cheque, 4 Agent, 5 Credit Customer, 6 E-wallet */
  refund_to?: number
  payment_lines?: Array<{
    payment_method: number
    amount: number
    bank?: { id: string; name?: string } | null
    slip_ref?: string
    slip_date?: string
    card?: string
  }>
  remarks?: string
}

export type RefundChannelResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: string; message: string }

const REFUND_TO_DEFAULT = 0

/** Label for refund method used in insufficient-balance messages (0=cash, 1=card, 2=slip, 3=check, 6=e-wallet). */
function getRefundMethodLabel(refundTo: number): string {
  const labels: Record<number, string> = {
    0: "cash",
    1: "card",
    2: "slip",
    3: "cheque",
    6: "e-wallet",
  }
  return labels[refundTo] ?? "cash"
}

function toCents(value: number): number {
  return Math.round(Number(value || 0) * 100)
}

function buildMixedLinesFromRefundInput(
  input: RefundChannelInput,
  totalRefundAmount: number
): { lines: ReceiptPaymentLineDraft[] } | { error: string } {
  if (input.refund_to !== SAVE_PAYMENT_TYPE_MIXED) return { lines: [] }
  const lines = (input.payment_lines ?? [])
    .map((line) => ({
      paymentMethod: line.payment_method,
      amount: -1 * (Math.round(Number(line.amount || 0) * 100) / 100),
      bank: line.bank?.name ?? "",
      bankId: line.bank?.id ?? null,
      cardReference: line.card ?? "",
      slipReference: line.slip_ref ?? "",
      slipDate:
        line.payment_method === SAVE_PAYMENT_TYPE_SLIP
          ? parseSlipDateInput(line.slip_date)
          : null,
    }))
  if (lines.length < 2) {
    return { error: "At least two payment lines are required for mixed refund." }
  }
  const allowed = new Set([
    SAVE_PAYMENT_TYPE_CASH,
    SAVE_PAYMENT_TYPE_CREDIT_CARD,
    SAVE_PAYMENT_TYPE_SLIP,
    SAVE_PAYMENT_TYPE_E_WALLET,
  ])
  for (const line of lines) {
    if (line.amount >= 0) {
      return { error: "Each mixed refund line amount must be greater than 0.00." }
    }
    if (!allowed.has(line.paymentMethod)) {
      return { error: "Mixed refund lines only allow Cash, Credit Card, Slip, and E-Wallet." }
    }
    if (
      line.paymentMethod === SAVE_PAYMENT_TYPE_CREDIT_CARD &&
      (!line.bankId || !line.cardReference.trim())
    ) {
      return { error: "Card refund lines require both bank and card reference." }
    }
    if (
      line.paymentMethod === SAVE_PAYMENT_TYPE_SLIP &&
      (!line.bankId || !line.slipReference.trim())
    ) {
      return { error: "Slip refund lines require both bank and slip reference." }
    }
  }
  const sum = lines.reduce((acc, line) => acc + line.amount, 0)
  if (toCents(Math.abs(sum)) !== toCents(totalRefundAmount)) {
    return { error: "Mixed refund line total must match refund amount." }
  }
  return { lines }
}

/**
 * Refund channel: Cancel (refund_type 0) or partial Refund (refund_type 1).
 * Permission must be checked by caller.
 */
export async function refundChannelService(
  input: RefundChannelInput,
  userId: string | null
): Promise<RefundChannelResult> {
  if (userId) {
    try {
      await requireActiveShift(userId)
    } catch (e) {
      if (isShiftRequirementError(e)) {
        return { success: false, errorCode: e.code, message: e.message }
      }
      throw e
    }
  }

  const currentShift = userId ? await getCurrentShift(userId) : null
  const shiftId = currentShift?.id ?? undefined

  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
    include: {
      session: true,
      receipts: {
        where: { method: 1 },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { paymentLines: true },
      },
    },
  })

  if (!booking) {
    return { success: false, errorCode: "not_found", message: "Booking not found." }
  }

  const sessionRefundable = booking.session?.refundable ?? 1
  if (sessionRefundable === 0) {
    return {
      success: false,
      errorCode: "non_refundable_session",
      message: "This is a non-refundable session.",
    }
  }

  // Refund field: 0 = none, 1 = prof only, 2 = hosp only, 3 = full. Reject if already refunded.
  const bookingRefund = booking.refund ?? 0
  if (bookingRefund !== 0) {
    return {
      success: false,
      errorCode: "already_refunded",
      message: "This booking has already been refunded and cannot be refunded again.",
    }
  }

  // Block refund/cancel if doctor has already been paid for this booking.
  if (booking.doctorPayment === true) {
    return {
      success: false,
      errorCode: "doctor_already_paid",
      message: "Refund and cancel are not allowed because the doctor has already been paid for this booking.",
    }
  }

  const bookingAgencyId = booking.agencyId ?? null
  const bookingCreditCustomerId = (booking as { creditCustomerId?: string | null }).creditCustomerId ?? null
  const receiptPaymentMethod = (booking as { receiptPaymentMethod?: number | null }).receiptPaymentMethod ?? null
  const refundTo = input.refund_to ?? REFUND_TO_DEFAULT
  const receiptLocationId = await resolveReceiptLocationId(
    userId,
    booking.locationId ?? null
  )

  if (receiptPaymentMethod === SAVE_PAYMENT_TYPE_CASH && refundTo !== SAVE_PAYMENT_TYPE_CASH) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "Bookings paid by Cash can only be refunded as Cash.",
    }
  }
  if (receiptPaymentMethod === 3 && refundTo !== SAVE_PAYMENT_TYPE_CASH) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "Bookings paid by Cheque can only be refunded as Cash.",
    }
  }
  if (
    receiptPaymentMethod === SAVE_PAYMENT_TYPE_SLIP &&
    refundTo !== SAVE_PAYMENT_TYPE_CASH &&
    refundTo !== SAVE_PAYMENT_TYPE_SLIP
  ) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "Bookings paid by Slip can only be refunded as Cash or Slip.",
    }
  }

  // Refund destination must match booking type when Agent or Credit Customer (refund goes back to same party)
  if (refundTo === 4 && !bookingAgencyId) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "This booking was not paid by Agent. Refund to Agent is only allowed for Agent bookings.",
    }
  }
  if (refundTo === 5 && !bookingCreditCustomerId) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "This booking was not paid by Credit Customer. Refund to Credit is only allowed for Credit Customer bookings.",
    }
  }
  if (refundTo === SAVE_PAYMENT_TYPE_MIXED && input.refund_type !== 0) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "Mixed refund is only allowed for cancel flow.",
    }
  }
  if (
    refundTo === SAVE_PAYMENT_TYPE_MIXED &&
    receiptPaymentMethod !== SAVE_PAYMENT_TYPE_MIXED
  ) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "Mixed refund is only allowed when the original settlement payment method was mixed.",
    }
  }

  const remarksTrimmed = (input.remarks ?? "").trim()
  if (!remarksTrimmed) {
    return {
      success: false,
      errorCode: "remarks_required",
      message: input.refund_type === 0 ? "Cancel remarks are required." : "Refund remarks are required.",
    }
  }

  let remarks = remarksTrimmed
  const paidReceipt = booking.receipts?.[0]
  if (paidReceipt) {
    remarks = `${remarks} - Ref Bill No. : ${paidReceipt.receiptNoString}`
  }

  // Cancel (refund_type 0)
  if (input.refund_type === 0) {
    if (booking.status === 1) {
      // Paid: full refund — receipt + refund fields; status must be 2 (canceled) like unpaid cancel path.
      // booking.amount is already net (does not include discount), so do not subtract discount again.
      const refundAmount = booking.amount
      const isAgent = refundTo === 4
      const isCreditCustomer = refundTo === 5
      const needTill = [0, 1, 2, 3, 6, SAVE_PAYMENT_TYPE_MIXED].includes(refundTo) // mixed uses till split lines
      const needJournal = needTill || isAgent || isCreditCustomer
      const fallbackMixedLines =
        refundTo === SAVE_PAYMENT_TYPE_MIXED &&
        (!input.payment_lines || input.payment_lines.length === 0) &&
        paidReceipt?.paymentLines?.length
          ? paidReceipt.paymentLines
              .filter((line) => Number(line.amount) > 0)
              .map((line) => ({
                payment_method: line.paymentMethod,
                amount: Number(line.amount),
                bank: line.bankId ? { id: line.bankId, name: line.bank ?? "" } : null,
                card: line.cardReference ?? "",
                slip_ref: line.slipReference ?? "",
                slip_date: formatSlipDate(line.slipDate) ?? undefined,
              }))
          : undefined
      const mixedLinesResult = buildMixedLinesFromRefundInput(
        fallbackMixedLines ? { ...input, payment_lines: fallbackMixedLines } : input,
        refundAmount
      )
      if ("error" in mixedLinesResult) {
        return { success: false, errorCode: "invalid_input", message: mixedLinesResult.error }
      }
      const paymentLines = mixedLinesResult.lines.length > 0 ? mixedLinesResult.lines : undefined
      let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
      if (needJournal) {
        const reqResult = await requireReceiptJournalAccounts(
          {
            locationId: receiptLocationId,
            userLocationId: receiptLocationId,
            createdBy: userId,
            agencyId: booking.agencyId ?? null,
            creditCustomerId: bookingCreditCustomerId,
            doctorId: booking.doctorId ?? null,
            needTill,
          },
          { needTill, isAgent, isCreditCustomer }
        )
        if (!reqResult.success) {
          return {
            success: false,
            errorCode: reqResult.errorCode,
            message: reqResult.error,
          }
        }
        accounts = reqResult.accounts
      } else {
        const resolveResult = await resolveReceiptJournalAccounts({
          locationId: receiptLocationId,
          userLocationId: receiptLocationId,
          createdBy: userId,
          agencyId: booking.agencyId ?? null,
          creditCustomerId: bookingCreditCustomerId,
          doctorId: booking.doctorId ?? null,
          needTill,
        })
        if (isResolveReceiptJournalAccountsError(resolveResult)) {
          return {
            success: false,
            errorCode: resolveResult.errorCode,
            message: resolveResult.error,
          }
        }
        accounts = resolveResult
      }
      // Refund that pays out from till: till must have sufficient balance for this payment method (cash, card, etc.)
      if (needTill && accounts?.cashierAccountId) {
        const refundAmountCents = Math.round(Math.abs(refundAmount) * 100)
        const breakdown = await getTillBalanceBreakdownForAccount(accounts.cashierAccountId)
        if (refundTo === SAVE_PAYMENT_TYPE_MIXED && paymentLines?.length) {
          const totalsByMethod = paymentLines.reduce((acc, line) => {
            acc.set(line.paymentMethod, (acc.get(line.paymentMethod) ?? 0) + toCents(line.amount))
            return acc
          }, new Map<number, number>())
          for (const [method, needed] of totalsByMethod.entries()) {
            const available = getTillBalanceCentsByMethod(breakdown, method)
            if (available < needed) {
              const methodLabel = getRefundMethodLabel(method)
              return {
                success: false,
                errorCode: "INSUFFICIENT_TILL_BALANCE",
                message:
                  available <= 0
                    ? `Till has no ${methodLabel} balance. Cannot refund until the till has sufficient ${methodLabel}.`
                    : `Insufficient ${methodLabel} balance in till. Available: ${formatCents(available)} LKR, required: ${formatCents(needed)} LKR.`,
              }
            }
          }
        } else {
          const tillBalanceCents = getTillBalanceCentsByMethod(breakdown, refundTo)
          if (tillBalanceCents < refundAmountCents) {
            const methodLabel = getRefundMethodLabel(refundTo)
            return {
              success: false,
              errorCode: "INSUFFICIENT_TILL_BALANCE",
              message:
                tillBalanceCents <= 0
                  ? `Till has no ${methodLabel} balance. Cannot refund until the till has sufficient ${methodLabel}.`
                  : `Insufficient ${methodLabel} balance in till. Available: ${formatCents(tillBalanceCents)} LKR, required: ${formatCents(refundAmountCents)} LKR.`,
            }
          }
        }
      }
      const refundAmountCentsForJournal = Math.round(Math.abs(refundAmount) * 100)
      const hospitalFeeAfterDiscount = Math.max(
        0,
        (booking.hospitalFee ?? 0) - (booking.hospitalFeeDiscount ?? 0)
      )
      const professionalFeeAfterDiscount = Math.max(
        0,
        (booking.professionalFee ?? 0) - (booking.professionsalFeeDiscount ?? 0)
      )
      const channelPaymentFeeSplitCancel =
        accounts?.doctorAccountId && refundAmountCentsForJournal > 0
          ? {
              hospitalFeeCents: Math.min(
                Math.round(hospitalFeeAfterDiscount * 100),
                refundAmountCentsForJournal
              ),
              professionalFeeCents: 0 as number,
            }
          : undefined
      if (channelPaymentFeeSplitCancel) {
        channelPaymentFeeSplitCancel.professionalFeeCents =
          refundAmountCentsForJournal - channelPaymentFeeSplitCancel.hospitalFeeCents
      }

      const journalNumberResult = accounts
        ? await getNextSequenceNumber("journal", { startFrom: 1 })
        : null
      const journalNumber = journalNumberResult?.success ? journalNumberResult.value : 0

      const result = await prisma.$transaction(async (tx) => {
        const r = await createReceiptAndUpdateBooking(tx, {
          bookingId: booking.id,
          locationId: booking.locationId ?? null,
          receiptSequenceMethod: 0, // REFUND RECEIPTS
          paymentMethod: refundTo,
          // Outflow: store as negative so receipt.amount and booking.refundAmount are negative (convention for refunds)
          amount: -1 * refundAmount,
          bank:
            paidReceipt && (refundTo === SAVE_PAYMENT_TYPE_CREDIT_CARD || refundTo === SAVE_PAYMENT_TYPE_SLIP)
              ? paidReceipt.bank
              : "",
          bankId:
            paidReceipt && (refundTo === SAVE_PAYMENT_TYPE_CREDIT_CARD || refundTo === SAVE_PAYMENT_TYPE_SLIP)
              ? paidReceipt.bankId
              : null,
          cardReference:
            (refundTo === SAVE_PAYMENT_TYPE_CREDIT_CARD || refundTo === SAVE_PAYMENT_TYPE_E_WALLET) && paidReceipt
              ? paidReceipt.cardReference
              : "",
          slipReference: refundTo === SAVE_PAYMENT_TYPE_SLIP && paidReceipt ? paidReceipt.slipReference : "",
          slipDate:
            refundTo === SAVE_PAYMENT_TYPE_SLIP && paidReceipt
              ? paidReceipt.slipDate ?? null
              : null,
          paymentLines,
          remarks,
          type: 0,
          method: 0,
          agencyId: booking.agencyId ?? null,
          creditCustomerId: refundTo === 5 ? bookingCreditCustomerId : null,
          createdBy: userId,
          shiftId,
          userLocationId: receiptLocationId,
          getBookingUpdate: (receipt) => ({
            status: 2,
            refund: 3,
            refundAmount: receipt.amount, // same sign as receipt (negative)
            refundReason: remarks,
            refundAmountProfessionalFee: Math.round(professionalFeeAfterDiscount),
            refundAmountHospitalFee: Math.round(hospitalFeeAfterDiscount),
            refundReceiptId: receipt.id,
            refundReceiptNoString: receipt.receiptNoString,
            refundReceiptCreatedAt: receipt.createdAt,
          }),
        })
        if (!r.success) return r
        if (accounts && journalNumber > 0) {
          const journalInput = buildReceiptJournalEntryInput(
            r.receipt,
            accounts,
            channelPaymentFeeSplitCancel ?? undefined
          )
          if ((isAgent || isCreditCustomer) && !journalInput) {
            throw new Error(
              isCreditCustomer
                ? "Credit customer account or journal setup failed. Cannot complete refund."
                : "Agent account or journal setup failed. Cannot complete refund."
            )
          }
          if (journalInput) {
            const jResult = await createJournalEntryInTransaction(tx, journalInput, journalNumber)
            if (!jResult.success) throw new Error(jResult.error)
          }
        }
        return r
      })
      if (!result.success) {
        return { success: false, errorCode: result.errorCode, message: result.message }
      }
      if (needTill && userId) {
        const io = getIO()
        if (io) io.to(floatBalanceRoom(userId)).emit("float-balance-update", {})
      }
    } else if (booking.status === 0) {
      // Pending: just cancel, no receipt
      const now = new Date()
      await prisma.booking.update({
        where: { id: input.booking_id },
        data: {
          status: 2,
          canceledAt: now,
          ...(userId ? { canceledBy: userId } : {}),
        },
      })
    } else {
      return { success: false, errorCode: "invalid_state", message: "Booking cannot be canceled." }
    }
  } else if (input.refund_type === 1 && booking.status === 1) {
    // Partial refund: create refund receipt and update booking in one transaction.
    const totalRefund = input.professional_fee + input.hospital_fee
    if (totalRefund <= 0) {
      return { success: false, errorCode: "invalid_input", message: "Select at least one refundable amount." }
    }
    if (input.professional_fee > 0 && input.hospital_fee > 0) {
      return {
        success: false,
        errorCode: "invalid_input",
        message: "Refund only one fee at a time: professional or hospital, not both.",
      }
    }

    let refundType = 0
    if (input.hospital_fee > 0) refundType = 2
    else if (input.professional_fee > 0) refundType = 1

    const isAgent = refundTo === 4
    const isCreditCustomer = refundTo === 5
    if (refundTo === SAVE_PAYMENT_TYPE_MIXED) {
      return {
        success: false,
        errorCode: "invalid_refund_to",
        message: "Mixed refund is only allowed for full cancel refunds.",
      }
    }
    const needTill = [0, 1, 2, 3, 6].includes(refundTo) // cash, card, slip, check, e-wallet (not agent, not credit customer)
    const needJournal = needTill || isAgent || isCreditCustomer
    let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
    if (needJournal) {
      const reqResult = await requireReceiptJournalAccounts(
        {
          locationId: receiptLocationId,
          userLocationId: receiptLocationId,
          createdBy: userId,
          agencyId: booking.agencyId ?? null,
          creditCustomerId: bookingCreditCustomerId,
          doctorId: booking.doctorId ?? null,
          needTill,
        },
        { needTill, isAgent, isCreditCustomer }
      )
      if (!reqResult.success) {
        return {
          success: false,
          errorCode: reqResult.errorCode,
          message: reqResult.error,
        }
      }
      accounts = reqResult.accounts
    } else {
      const resolveResult = await resolveReceiptJournalAccounts({
        locationId: receiptLocationId,
        userLocationId: receiptLocationId,
        createdBy: userId,
        agencyId: booking.agencyId ?? null,
        creditCustomerId: bookingCreditCustomerId,
        doctorId: booking.doctorId ?? null,
        needTill,
      })
      if (isResolveReceiptJournalAccountsError(resolveResult)) {
        return {
          success: false,
          errorCode: resolveResult.errorCode,
          message: resolveResult.error,
        }
      }
      accounts = resolveResult
    }
    const totalRefundCents = Math.round(totalRefund * 100)
    const channelPaymentFeeSplitPartial =
      accounts?.doctorAccountId && totalRefundCents > 0
        ? {
            hospitalFeeCents: Math.min(
              Math.round(input.hospital_fee * 100),
              totalRefundCents
            ),
            professionalFeeCents: 0 as number,
          }
        : undefined
    if (channelPaymentFeeSplitPartial) {
      channelPaymentFeeSplitPartial.professionalFeeCents =
        totalRefundCents - channelPaymentFeeSplitPartial.hospitalFeeCents
    }
    // Refund that pays out from till: till must have sufficient balance for this payment method (cash, card, etc.)
    if (needTill && accounts?.cashierAccountId) {
      const refundAmountCents = totalRefundCents
      const breakdown = await getTillBalanceBreakdownForAccount(accounts.cashierAccountId)
      const tillBalanceCents = getTillBalanceCentsByMethod(breakdown, refundTo)
      if (tillBalanceCents < refundAmountCents) {
        const methodLabel = getRefundMethodLabel(refundTo)
        return {
          success: false,
          errorCode: "INSUFFICIENT_TILL_BALANCE",
          message:
            tillBalanceCents <= 0
              ? `Till has no ${methodLabel} balance. Cannot refund until the till has sufficient ${methodLabel}.`
              : `Insufficient ${methodLabel} balance in till. Available: ${formatCents(tillBalanceCents)} LKR, required: ${formatCents(refundAmountCents)} LKR.`,
        }
      }
    }
    const journalNumberResult = accounts
      ? await getNextSequenceNumber("journal", { startFrom: 1 })
      : null
    const journalNumber = journalNumberResult?.success ? journalNumberResult.value : 0

    const result = await prisma.$transaction(async (tx) => {
      const r = await createReceiptAndUpdateBooking(tx, {
        bookingId: booking.id,
        locationId: booking.locationId ?? null,
        receiptSequenceMethod: 0, // REFUND RECEIPTS
        paymentMethod: refundTo,
        // Outflow: store as negative (same convention as cancel/refund)
        amount: -1 * totalRefund,
        bank:
          paidReceipt && (refundTo === SAVE_PAYMENT_TYPE_CREDIT_CARD || refundTo === SAVE_PAYMENT_TYPE_SLIP)
            ? paidReceipt.bank
            : "",
        bankId:
          paidReceipt && (refundTo === SAVE_PAYMENT_TYPE_CREDIT_CARD || refundTo === SAVE_PAYMENT_TYPE_SLIP)
            ? paidReceipt.bankId
            : null,
        cardReference:
          (refundTo === SAVE_PAYMENT_TYPE_CREDIT_CARD || refundTo === SAVE_PAYMENT_TYPE_E_WALLET) && paidReceipt
            ? paidReceipt.cardReference
            : "",
        slipReference: refundTo === SAVE_PAYMENT_TYPE_SLIP && paidReceipt ? paidReceipt.slipReference : "",
        slipDate:
          refundTo === SAVE_PAYMENT_TYPE_SLIP && paidReceipt
            ? paidReceipt.slipDate ?? null
            : null,
        remarks,
        type: 0,
        method: 0,
        agencyId: booking.agencyId ?? null,
        creditCustomerId: refundTo === 5 ? bookingCreditCustomerId : null,
        createdBy: userId,
        shiftId,
        userLocationId: receiptLocationId,
        getBookingUpdate: (receipt) => ({
          refund: refundType,
          refundAmount: receipt.amount, // same sign as receipt (negative)
          refundReason: remarks,
          refundAmountProfessionalFee: input.professional_fee,
          refundAmountHospitalFee: input.hospital_fee,
          refundReceiptId: receipt.id,
          refundReceiptNoString: receipt.receiptNoString,
          refundReceiptCreatedAt: receipt.createdAt,
        }),
      })
        if (!r.success) return r
        if (accounts && journalNumber > 0) {
          const journalInput = buildReceiptJournalEntryInput(
            r.receipt,
            accounts,
            channelPaymentFeeSplitPartial ?? undefined
          )
          if ((isAgent || isCreditCustomer) && !journalInput) {
            throw new Error(
              isCreditCustomer
                ? "Credit customer account or journal setup failed. Cannot complete refund."
                : "Agent account or journal setup failed. Cannot complete refund."
            )
          }
          if (journalInput) {
            const jResult = await createJournalEntryInTransaction(tx, journalInput, journalNumber)
            if (!jResult.success) throw new Error(jResult.error)
          }
        }
        return r
      })
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, message: result.message }
    }
    if (needTill && userId) {
      const io = getIO()
      if (io) io.to(floatBalanceRoom(userId)).emit("float-balance-update", {})
    }
  } else {
    return {
      success: false,
      errorCode: "invalid_state",
      message: "Refund only allowed for paid bookings.",
    }
  }

  const data = await getBookingForSaveBooking(input.booking_id)
  return { success: true, data }
}
