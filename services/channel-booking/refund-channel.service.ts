import prisma from "@/lib/prisma"
import {
  createReceiptAndUpdateBooking,
  getBookingForSaveBooking,
  getNextSequenceNumber,
  buildReceiptJournalEntryInput,
  isResolveReceiptJournalAccountsError,
  resolveReceiptJournalAccounts,
  requireReceiptJournalAccounts,
} from "./helpers"
import { createJournalEntryInTransaction, getAccountBalance } from "@/services/accounting.service"
import { formatCents } from "@/lib/format-money"
import { getIO, floatBalanceRoom } from "@/lib/socket-server"

/** refund_type: 0 = Cancel (full or no refund), 1 = Refund (partial) */
export type RefundChannelInput = {
  booking_id: string
  refund_type: number
  professional_fee: number
  hospital_fee: number
  /** 0 Cash, 1 Card, 2 Slip, 3 Cheque, 4 Agent, 5 Credit Customer, 6 E-wallet */
  refund_to?: number
  remarks?: string
}

export type RefundChannelResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: string; message: string }

const REFUND_TO_DEFAULT = 0

/**
 * Refund channel: Cancel (refund_type 0) or partial Refund (refund_type 1).
 * Permission must be checked by caller.
 */
export async function refundChannelService(
  input: RefundChannelInput,
  userId: string | null
): Promise<RefundChannelResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
    include: {
      session: true,
      receipts: { where: { method: 1 }, orderBy: { createdAt: "desc" }, take: 1 },
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

  const bookingAgencyId = booking.agencyId ?? null
  const bookingCreditCustomerId = (booking as { creditCustomerId?: string | null }).creditCustomerId ?? null
  const receiptPaymentMethod = (booking as { receiptPaymentMethod?: number | null }).receiptPaymentMethod ?? null
  const refundTo = input.refund_to ?? REFUND_TO_DEFAULT

  // Cash (0), Slip (2), Cheque (3): only Cash refund allowed
  if (receiptPaymentMethod !== null && [0, 2, 3].includes(receiptPaymentMethod) && refundTo !== 0) {
    return {
      success: false,
      errorCode: "invalid_refund_to",
      message: "Bookings paid by Cash, Slip, or Cheque can only be refunded as Cash.",
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
      // Paid: full refund — create refund receipt and update refund fields only. Do NOT set status to 2.
      const refundAmount = booking.amount - booking.discount
      const isAgent = refundTo === 4
      const isCreditCustomer = refundTo === 5
      const needTill = [0, 1, 2, 3, 6].includes(refundTo) // cash, card, slip, check, e-wallet (not agent, not credit customer)
      const needJournal = needTill || isAgent || isCreditCustomer
      let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
      if (needJournal) {
        const reqResult = await requireReceiptJournalAccounts(
          {
            locationId: booking.locationId ?? null,
            createdBy: userId,
            agencyId: booking.agencyId ?? null,
            creditCustomerId: bookingCreditCustomerId,
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
          locationId: booking.locationId ?? null,
          createdBy: userId,
          agencyId: booking.agencyId ?? null,
          creditCustomerId: bookingCreditCustomerId,
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
      // Refund that pays out from till: till must have sufficient balance
      if (needTill && accounts?.cashierAccountId) {
        const refundAmountCents = Math.round(Math.abs(refundAmount) * 100)
        const tillBalanceCents = await getAccountBalance(accounts.cashierAccountId)
        if (tillBalanceCents < refundAmountCents) {
          return {
            success: false,
            errorCode: "INSUFFICIENT_TILL_BALANCE",
            message:
              tillBalanceCents <= 0
                ? "Till has no balance. Cannot refund until the till has sufficient cash."
                : `Insufficient till balance. Available: ${formatCents(tillBalanceCents)} LKR, required: ${formatCents(refundAmountCents)} LKR.`,
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
          amount: -1 * refundAmount,
          bank: refundTo === 1 && paidReceipt ? paidReceipt.bank : "",
          bankId: refundTo === 1 && paidReceipt ? paidReceipt.bankId : null,
          cardReference: refundTo === 1 && paidReceipt ? paidReceipt.cardReference : "",
          slipReference: "",
          remarks,
          type: 0,
          method: 0,
          agencyId: booking.agencyId ?? null,
          creditCustomerId: refundTo === 5 ? bookingCreditCustomerId : null,
          createdBy: userId,
          userLocationId: null,
          getBookingUpdate: (receipt) => ({
            refund: 3,
            refundAmount: receipt.amount,
            refundReceiptId: receipt.id,
            refundReceiptNoString: receipt.receiptNoString,
            refundReceiptCreatedAt: receipt.createdAt,
          }),
        })
        if (!r.success) return r
        if (accounts && journalNumber > 0) {
          const journalInput = buildReceiptJournalEntryInput(r.receipt, accounts)
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
      await prisma.booking.update({
        where: { id: input.booking_id },
        data: { status: 2 },
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

    let refundType = 0
    if (input.hospital_fee > 0 && input.professional_fee > 0) refundType = 3
    else if (input.hospital_fee > 0) refundType = 2
    else if (input.professional_fee > 0) refundType = 1

    const isAgent = refundTo === 4
    const isCreditCustomer = refundTo === 5
    const needTill = [0, 1, 2, 3, 6].includes(refundTo) // cash, card, slip, check, e-wallet (not agent, not credit customer)
    const needJournal = needTill || isAgent || isCreditCustomer
    let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
    if (needJournal) {
      const reqResult = await requireReceiptJournalAccounts(
        {
          locationId: booking.locationId ?? null,
          createdBy: userId,
          agencyId: booking.agencyId ?? null,
          creditCustomerId: bookingCreditCustomerId,
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
        locationId: booking.locationId ?? null,
        createdBy: userId,
        agencyId: booking.agencyId ?? null,
        creditCustomerId: bookingCreditCustomerId,
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
    // Refund that pays out from till: till must have sufficient balance
    if (needTill && accounts?.cashierAccountId) {
      const refundAmountCents = Math.round(totalRefund * 100)
      const tillBalanceCents = await getAccountBalance(accounts.cashierAccountId)
      if (tillBalanceCents < refundAmountCents) {
        return {
          success: false,
          errorCode: "INSUFFICIENT_TILL_BALANCE",
          message:
            tillBalanceCents <= 0
              ? "Till has no balance. Cannot refund until the till has sufficient cash."
              : `Insufficient till balance. Available: ${formatCents(tillBalanceCents)} LKR, required: ${formatCents(refundAmountCents)} LKR.`,
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
        amount: -1 * totalRefund,
        bank: refundTo === 1 && paidReceipt ? paidReceipt.bank : "",
        bankId: refundTo === 1 && paidReceipt ? paidReceipt.bankId : null,
        cardReference: refundTo === 1 && paidReceipt ? paidReceipt.cardReference : "",
        slipReference: "",
        remarks,
        type: 0,
        method: 0,
        agencyId: booking.agencyId ?? null,
        creditCustomerId: refundTo === 5 ? bookingCreditCustomerId : null,
        createdBy: userId,
        userLocationId: null,
        getBookingUpdate: (receipt) => ({
          refund: refundType,
          refundAmount: receipt.amount,
        }),
      })
      if (!r.success) return r
      if (accounts && journalNumber > 0) {
        const journalInput = buildReceiptJournalEntryInput(r.receipt, accounts)
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
