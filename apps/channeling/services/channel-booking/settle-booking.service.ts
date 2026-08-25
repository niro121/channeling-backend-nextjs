import prisma from "@/lib/prisma"
import {
  createReceiptAndUpdateBooking,
  computeBookingDiscounts,
  getRefundFeeTypes,
  getBookingForSaveBooking,
  getNextSequenceNumber,
  buildReceiptJournalEntryInput,
  isResolveReceiptJournalAccountsError,
  resolveReceiptJournalAccounts,
  requireReceiptJournalAccounts,
  resolveReceiptLocationId,
} from "./helpers"
import { createJournalEntryInTransaction } from "@/services/accounting.service"
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
import { parseSlipDateInput } from "@/lib/slip-date"
import { isSessionDoctorDeparted } from "@/lib/channel-room/is-session-doctor-arrived"

function toCents(value: number): number {
  return Math.round(Number(value || 0) * 100)
}

function buildMixedLinesFromSettleInput(input: SettleBookingInput, amount: number) {
  if (input.settle_method !== SAVE_PAYMENT_TYPE_MIXED) return null
  const lines = (input.payment_lines ?? [])
    .map((line) => ({
      paymentMethod: line.payment_method,
      amount: Math.round(line.amount * 100) / 100,
      bank: line.bank?.name ?? "",
      bankId: line.bank?.id ?? null,
      cardReference:
        line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD
          ? (line.card ?? "")
          : line.payment_method === SAVE_PAYMENT_TYPE_E_WALLET
            ? (line.ewallet_ref ?? "")
            : "",
      slipReference: line.slip_ref ?? "",
      slipDate:
        line.payment_method === SAVE_PAYMENT_TYPE_SLIP
          ? parseSlipDateInput(line.slip_date)
          : null,
    }))
  if (lines.length < 2) {
    return { error: "At least two payment lines are required for mixed payment." }
  }
  const allowed = new Set([
    SAVE_PAYMENT_TYPE_CASH,
    SAVE_PAYMENT_TYPE_CREDIT_CARD,
    SAVE_PAYMENT_TYPE_SLIP,
    SAVE_PAYMENT_TYPE_E_WALLET,
  ])
  for (const line of lines) {
    if (line.amount <= 0) {
      return { error: "Each mixed payment line amount must be greater than 0.00." }
    }
    if (!allowed.has(line.paymentMethod)) {
      return { error: "Mixed payment lines only allow Cash, Credit Card, Slip, and E-Wallet." }
    }
    if (
      line.paymentMethod === SAVE_PAYMENT_TYPE_CREDIT_CARD &&
      (!line.bankId || !line.cardReference.trim())
    ) {
      return { error: "Card payment lines require both bank and card reference." }
    }
    if (
      line.paymentMethod === SAVE_PAYMENT_TYPE_SLIP &&
      (!line.bankId || !line.slipReference.trim() || !line.slipDate)
    ) {
      return { error: "Slip payment lines require bank, slip reference, and slip date." }
    }
    if (line.paymentMethod === SAVE_PAYMENT_TYPE_E_WALLET && !line.cardReference.trim()) {
      return { error: "E-wallet payment lines require a reference." }
    }
  }
  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  if (toCents(total) !== toCents(amount)) {
    return { error: `Mixed payment line total (${total}) must equal settlement amount (${amount}).` }
  }
  return { lines }
}

export type SettleBookingInput = {
  booking_id: string
  settle_method: number // 0=Cash, 1=Credit Card, 2=Slip, 3=Cheque
  discount: number
  auto_discount_type?: string
  bank?: { id: string; name?: string } | null
  slip_ref?: string
  slip_date?: string
  card?: string
  ewallet_ref?: string
  payment_lines?: Array<{
    payment_method: number
    amount: number
    bank?: { id: string; name?: string } | null
    slip_ref?: string
    slip_date?: string
    card?: string
    ewallet_ref?: string
  }>
  /** Staff/user location when creating receipt (legacy user_location). */
  user_location_id?: string | null
}

export type SettleBookingServiceResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: string; message: string }

/**
 * Settle a pending booking: apply optional auto discount, create receipt, update booking to paid.
 * Permission must be checked by caller.
 */
export async function settleBookingService(
  input: SettleBookingInput,
  userId: string | null
): Promise<SettleBookingServiceResult> {
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

  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
    include: { session: { include: { location: true, room: true, doctor: true } } },
  })

  if (!booking || booking.status !== 0) {
    return {
      success: false,
      errorCode: "invalid_booking",
      message: !booking ? "Booking not found." : "Booking is not pending payment.",
    }
  }

  if (booking.session?.status === 0) {
    return {
      success: false,
      errorCode: "session_on_leave",
      message: "Doctor is on leave for this session. Settlement is not allowed.",
    }
  }

  const sessionWithMeta = booking.session as
    | { date?: Date; doctorArrivalTime?: unknown; doctorDepatureTime?: unknown }
    | null
  if (sessionWithMeta?.date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sessionDate = sessionWithMeta.date instanceof Date ? sessionWithMeta.date : new Date(sessionWithMeta.date)
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
    if (sessionDay < today) {
      return {
        success: false,
        errorCode: "session_date_past",
        message:
          "Cannot settle a booking for a past session date. Only today's sessions can be settled.",
      }
    }
  }

  // Server-side mandatory fields:
  // - Slip settlements require bank + slip reference + slip date.
  // - Credit card settlements require bank + card reference.
  if (input.settle_method === SAVE_PAYMENT_TYPE_SLIP) {
    if (!input.bank?.id) {
      return {
        success: false,
        errorCode: "missing_bank",
        message: "Bank is required when settling via Slip.",
      }
    }
    if (!input.slip_ref?.trim()) {
      return {
        success: false,
        errorCode: "missing_slip_reference",
        message: "Slip reference is required when settling via Slip.",
      }
    }
    if (!parseSlipDateInput(input.slip_date)) {
      return {
        success: false,
        errorCode: "missing_slip_date",
        message: "Slip date is required when settling via Slip.",
      }
    }
  }
  if (input.settle_method === SAVE_PAYMENT_TYPE_CREDIT_CARD) {
    if (!input.bank?.id) {
      return {
        success: false,
        errorCode: "missing_bank",
        message: "Bank is required when settling via Credit Card.",
      }
    }
    if (!input.card?.trim()) {
      return {
        success: false,
        errorCode: "missing_card_reference",
        message: "Card reference is required when settling via Credit Card.",
      }
    }
  }
  if (input.settle_method === SAVE_PAYMENT_TYPE_E_WALLET && !input.ewallet_ref?.trim()) {
    return {
      success: false,
      errorCode: "missing_ewallet_reference",
      message: "E-wallet reference is required when settling via E-Wallet.",
    }
  }

  if (isSessionDoctorDeparted(sessionWithMeta)) {
    return {
      success: false,
      errorCode: "doctor_departed",
      message:
        "Doctor has departed. Doctor must arrive again before settlement is allowed.",
    }
  }

  if (!booking.session) {
    return {
      success: false,
      errorCode: "invalid_booking",
      message: "Booking session not found.",
    }
  }

  const sessionForDiscount = { fees: booking.session.fees }
  const { professional_fee, hospital_fee } = getRefundFeeTypes(
    sessionForDiscount.fees,
    booking.foriegner
  )
  const grossAmount = professional_fee + hospital_fee

  const discountResult = await computeBookingDiscounts({
    autoDiscountId: booking.autoDiscountId ?? input.auto_discount_type ?? null,
    manualDiscountId: booking.discountId ?? null,
    payment_method: booking.method,
    payment_type: input.settle_method,
    session: sessionForDiscount,
    foriegner: booking.foriegner,
    strict: false,
    rejectExceedsFeeCap: true,
  })
  if (!discountResult.success) {
    return {
      success: false,
      errorCode: "discountError",
      message: discountResult.message,
    }
  }

  const discount = discountResult.discount_value
  const discountDivision = discountResult.discountDivision

  if (Math.abs(input.discount - discount) > 0.009) {
    return {
      success: false,
      errorCode: "discountError",
      message: "Discount does not match server calculation for this payment method. Please refresh and try again.",
    }
  }

  const amount = Math.round((grossAmount - discount) * 100) / 100
  const mixedLinesResult = buildMixedLinesFromSettleInput(input, amount)
  if (mixedLinesResult?.error) {
    return {
      success: false,
      errorCode: "invalid_payment_lines",
      message: mixedLinesResult.error,
    }
  }
  const paymentLines = mixedLinesResult?.lines

  const receiptLocationId =
    input.user_location_id?.trim() ||
    (await resolveReceiptLocationId(userId, booking.locationId ?? null))

  const needTill = [0, 1, 2, 3, 5, 6, SAVE_PAYMENT_TYPE_MIXED].includes(input.settle_method) // mixed uses till split lines
  const needJournal = needTill
  let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
  if (needJournal) {
    const reqResult = await requireReceiptJournalAccounts(
      {
        locationId: receiptLocationId,
        userLocationId: receiptLocationId,
        createdBy: userId,
        agencyId: booking.agencyId ?? null,
        doctorId: booking.doctorId ?? null,
        needTill,
      },
      { needTill, isAgent: false }
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
  const journalNumberResult = accounts
    ? await getNextSequenceNumber("journal", { startFrom: 1 })
    : null
  const journalNumber = journalNumberResult?.success ? journalNumberResult.value : 0

  const currentShift = userId ? await getCurrentShift(userId) : null
  const shiftId = currentShift?.id ?? undefined

  const result = await prisma.$transaction(async (tx) => {
    const r = await createReceiptAndUpdateBooking(tx, {
      bookingId: booking.id,
      locationId: booking.locationId ?? null,
      receiptSequenceMethod: 1, // PAYMENT RECEIPTS
      paymentMethod: input.settle_method,
      amount,
      bank: input.bank?.name ?? "",
      bankId: input.bank?.id ?? null,
      cardReference:
        input.settle_method === SAVE_PAYMENT_TYPE_E_WALLET
          ? (input.ewallet_ref ?? "")
          : (input.card ?? ""),
      slipReference: input.slip_ref ?? "",
      slipDate:
        input.settle_method === SAVE_PAYMENT_TYPE_SLIP
          ? parseSlipDateInput(input.slip_date)
          : null,
      remarks: "POS PAYMENT", // Settling a pending bill is issued as POS PAYMENT (same as save-booking)
      type: 1,
      method: 1, // PAYMENT RECEIPTS
      agencyId: booking.agencyId ?? null,
      createdBy: userId,
      shiftId,
      userLocationId: receiptLocationId,
      paymentLines,
      getBookingUpdate: (receipt) => ({
        status: 1,
        discountDivision,
        hospitalFeeDiscount: discountDivision.hospital_fee_discount,
        professionsalFeeDiscount: discountDivision.professionsal_fee_discount,
        discount,
        autoDiscountId: booking.autoDiscountId ?? input.auto_discount_type ?? null,
        amount,
        receiptNo: receipt.receiptNo,
        receiptNoString: receipt.receiptNoString,
        receiptPaymentMethod: input.settle_method === SAVE_PAYMENT_TYPE_MIXED ? SAVE_PAYMENT_TYPE_MIXED : input.settle_method,
        receiptNoCreatedAt: receipt.createdAt,
        receiptNoId: receipt.id,
        updatedBy: userId,
      }),
    })
    if (!r.success) return r
    if (accounts && journalNumber > 0) {
      const amountCents = Math.round(amount * 100)
      const hospitalFeeAfterDiscount = Math.max(0, hospital_fee - discountDivision.hospital_fee_discount)
      const hospitalFeeCents = Math.min(Math.round(hospitalFeeAfterDiscount * 100), amountCents)
      const channelPaymentFeeSplit =
        accounts.doctorAccountId && amountCents > 0
          ? { hospitalFeeCents, professionalFeeCents: amountCents - hospitalFeeCents }
          : undefined
      const journalInput = buildReceiptJournalEntryInput(r.receipt, accounts, channelPaymentFeeSplit)
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

  const fullBooking = await getBookingForSaveBooking(input.booking_id)
  return { success: true, data: fullBooking }
}
