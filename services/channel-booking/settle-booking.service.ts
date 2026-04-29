import prisma from "@/lib/prisma"
import {
  createReceiptAndUpdateBooking,
  getProcessedDiscount,
  getBookingForSaveBooking,
  getNextSequenceNumber,
  buildReceiptJournalEntryInput,
  isResolveReceiptJournalAccountsError,
  resolveReceiptJournalAccounts,
  requireReceiptJournalAccounts,
} from "./helpers"
import { createJournalEntryInTransaction } from "@/services/accounting.service"
import { getIO, floatBalanceRoom } from "@/lib/socket-server"
import { requireActiveShift, getCurrentShift } from "@/services/shift.service"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"

type ArrivalDepartureEntry = { time: string; createdBy: string }

function parseArrivalDepartureJson(json: unknown): ArrivalDepartureEntry[] {
  if (!Array.isArray(json)) return []
  return json.filter(
    (item): item is ArrivalDepartureEntry =>
      item != null &&
      typeof item === "object" &&
      "time" in item &&
      "createdBy" in item &&
      typeof (item as ArrivalDepartureEntry).time === "string" &&
      typeof (item as ArrivalDepartureEntry).createdBy === "string"
  )
}

function buildMixedLinesFromSettleInput(input: SettleBookingInput, amount: number) {
  if (input.settle_method !== SAVE_PAYMENT_TYPE_MIXED) return null
  const lines = (input.payment_lines ?? [])
    .map((line) => ({
      paymentMethod: line.payment_method,
      amount: Math.round(line.amount),
      bank: line.bank?.name ?? "",
      bankId: line.bank?.id ?? null,
      cardReference: line.card ?? "",
      slipReference: line.slip_ref ?? "",
    }))
    .filter((line) => line.amount > 0)
  if (lines.length < 2) {
    return { error: "At least two payment lines are required for mixed payment." }
  }
  const allowed = new Set([
    SAVE_PAYMENT_TYPE_CASH,
    SAVE_PAYMENT_TYPE_CREDIT_CARD,
    SAVE_PAYMENT_TYPE_E_WALLET,
  ])
  for (const line of lines) {
    if (!allowed.has(line.paymentMethod)) {
      return { error: "Mixed payment lines only allow Cash, Credit Card, and E-Wallet." }
    }
  }
  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  if (total !== amount) {
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
  card?: string
  payment_lines?: Array<{
    payment_method: number
    amount: number
    bank?: { id: string; name?: string } | null
    slip_ref?: string
    card?: string
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
  if (userId) await requireActiveShift(userId)

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
  // - Slip settlements require bank + slip reference.
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

  const arrivals = parseArrivalDepartureJson(sessionWithMeta?.doctorArrivalTime)
  const departures = parseArrivalDepartureJson(sessionWithMeta?.doctorDepatureTime)
  if (departures.length > 0) {
    const lastDepTime = Math.max(...departures.map((e) => parseInt(e.time, 10) || 0))
    const hasArrivalAfterLastDep = arrivals.some((e) => (parseInt(e.time, 10) || 0) > lastDepTime)
    if (!hasArrivalAfterLastDep) {
      return {
        success: false,
        errorCode: "doctor_departed",
        message:
          "Doctor has departed. Doctor must arrive again before settlement is allowed.",
      }
    }
  }

  let discount = input.discount
  const discountDivision = {
    hospital_fee_discount: booking.hospitalFeeDiscount ?? 0,
    professionsal_fee_discount: booking.professionsalFeeDiscount ?? 0,
    other_discount: 0,
  } as { hospital_fee_discount: number; professionsal_fee_discount: number; other_discount: number }

  if (input.auto_discount_type && booking.session) {
    // getProcessedDiscount only uses session.fees (for professional/hospital fee split).
    const result = await getProcessedDiscount(
      input.auto_discount_type,
      booking.method,
      input.settle_method,
      { fees: booking.session.fees },
      booking.foriegner
    )
    if (!result.status) {
      return {
        success: false,
        errorCode: "discountError",
        message: result.message ?? "Discount error.",
      }
    }
    discount = result.discount_value
    discountDivision.hospital_fee_discount = result.hospital_fee_discount
    discountDivision.professionsal_fee_discount = result.professionsal_fee_discount
    discountDivision.other_discount = result.other_discount
  }

  const amount = booking.amount - discount
  const mixedLinesResult = buildMixedLinesFromSettleInput(input, amount)
  if (mixedLinesResult?.error) {
    return {
      success: false,
      errorCode: "invalid_payment_lines",
      message: mixedLinesResult.error,
    }
  }
  const paymentLines = mixedLinesResult?.lines

  const needTill = [0, 1, 2, 3, 5, 6, SAVE_PAYMENT_TYPE_MIXED].includes(input.settle_method) // mixed uses till split lines
  const needJournal = needTill
  let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
  if (needJournal) {
    const reqResult = await requireReceiptJournalAccounts(
      {
        locationId: booking.locationId ?? null,
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
      locationId: booking.locationId ?? null,
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
      cardReference: input.card ?? "",
      slipReference: input.slip_ref ?? "",
      remarks: "POS PAYMENT", // Settling a pending bill is issued as POS PAYMENT (same as save-booking)
      type: 1,
      method: 1, // PAYMENT RECEIPTS
      agencyId: booking.agencyId ?? null,
      createdBy: userId,
      shiftId,
      userLocationId: input.user_location_id ?? null,
      paymentLines,
      getBookingUpdate: (receipt) => ({
        status: 1,
        discountDivision,
        hospitalFeeDiscount: discountDivision.hospital_fee_discount,
        professionsalFeeDiscount: discountDivision.professionsal_fee_discount,
        discount,
        autoDiscountId: input.auto_discount_type ?? null,
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
      const hospitalFeeAfterDiscount = Math.max(0, (booking.hospitalFee ?? 0) - discountDivision.hospital_fee_discount)
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
