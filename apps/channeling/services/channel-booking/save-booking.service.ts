import prisma from "@/lib/prisma"
import moment from "moment"
import { normalizeSessionTime } from "@/lib/utils"
import type { SaveBookingInput, SaveBookingErrorCode } from "@/types/save-booking"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"
import { getIO, channelBookingRoom, floatBalanceRoom } from "@/lib/socket-server"
import { sendSms } from "@/lib/helpers/sms/send-sms"
import {
  createReceiptAndUpdateBooking,
  loadSessionForSaveBooking,
  checkConsecutiveSessionFull,
  computeBookingDiscounts,
  getRefundFeeTypes,
  verifyAgencyReferenceWithReason,
  getAgentBalance,
  getBookingForSaveBooking,
  getNextSequenceNumber,
  advanceAppointmentSequenceCursor,
  prepareAppointmentNumberForNewBookingTx,
  type PrepareAppointmentNumberResult,
  updateAgentBalance,
  validateVoucherForDiscount,
  getBookingSequenceInfo,
  buildReceiptJournalEntryInput,
  isResolveReceiptJournalAccountsError,
  resolveReceiptJournalAccounts,
  requireReceiptJournalAccounts,
} from "./helpers"
import {
  createJournalEntryInTransaction,
  checkJournalEntryBalance,
} from "@/services/accounting.service"
import { requireActiveShift, getCurrentShift } from "@/services/shift.service"
import { emitSessionUpdateAfterBlocks } from "@/services/channel-booking/manage-session-appointment-blocks.service"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { Prisma } from "@prisma/client"

export type SaveBookingServiceResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: SaveBookingErrorCode; message: string }

export type SaveBookingServiceOptions = {
  /** When false, skip active-shift check even if userId is set (e.g. public API acting user). Default true. */
  requireActiveShift?: boolean
  /** Public API: store bookReference as-is (trimmed, uppercased) and only enforce uniqueness. */
  agencyRefUniqueOnly?: boolean
  /**
   * When false, leave booking pending (status 0): no receipt, no agency balance debit.
   * Applies to POS/Agent methods only. Default true.
   */
  settleOnCreate?: boolean
}

function isPrismaUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
}

function mapPrepareAppointmentFailure(
  r: Extract<PrepareAppointmentNumberResult, { ok: false }>
): { errorCode: SaveBookingErrorCode; message: string } {
  if (r.code === "LIMIT_EXCEEDED") {
    return { errorCode: "LIMIT_EXCEEDED", message: r.message }
  }
  return { errorCode: "INVALID_INPUT", message: r.message }
}

/** Spec §10: Create receipt for POS (0) or Agent (2); then set booking status 1 (booked). OnCall (1) does not create receipt. */
const CREATE_RECEIPT_METHODS = [0, 2] // POS, Agent

/** SMS template type 4 = Agent Balance Message after Booking Agent Channel. Placeholders: {agency_ref}, {doctor}, {appointment_no}, {date}, {time}, {amount}, {balance}. */
const SMS_TEMPLATE_TYPE_AGENCY_BALANCE = 4
const DEFAULT_AGENCY_BALANCE_MESSAGE =
  "Ref: {agency_ref}. Booking with Dr {doctor}, appointment no {appointment_no}, date {date}, time {time}. Amount: {amount}. Your balance: {balance}."

function toCents(value: number): number {
  return Math.round(Number(value || 0) * 100)
}

function buildMixedLinesFromSaveInput(input: SaveBookingInput, amountToUse: number) {
  if (input.payment_type !== SAVE_PAYMENT_TYPE_MIXED) return null
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
      (!line.bankId || !line.slipReference.trim())
    ) {
      return { error: "Slip payment lines require both bank and slip reference." }
    }
    if (line.paymentMethod === SAVE_PAYMENT_TYPE_E_WALLET && !line.cardReference.trim()) {
      return { error: "E-wallet payment lines require a reference." }
    }
  }
  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  if (toCents(total) !== toCents(amountToUse)) {
    return { error: `Mixed payment line total (${total}) must equal booking amount (${amountToUse}).` }
  }
  return { lines }
}

async function buildNormalizedAgencyRef(input: SaveBookingInput): Promise<string> {
  const rawRef = (input.agency_ref ?? "").toUpperCase().trim()
  const rawLeaf = (input.agency_leaf ?? "").replace(/\D/g, "")

  const leafPart =
    rawLeaf.length > 0
      ? rawLeaf.slice(0, 2).padStart(2, "0")
      : rawRef.slice(-2).replace(/\D/g, "").slice(0, 2).padStart(2, "0")

  if (!input.agency?.id) {
    return rawRef
  }

  if (input.agency_book_id) {
    const agencyBook = await prisma.agencyBook.findFirst({
      where: {
        id: input.agency_book_id,
        agencyId: input.agency.id,
        status: 1,
      },
      select: { bookNumber: true },
    })
    if (agencyBook?.bookNumber) {
      return `${agencyBook.bookNumber}${leafPart}`
    }
  }

  const fallbackBook = rawRef.substring(0, Math.max(0, rawRef.length - 2)).trim()
  return `${fallbackBook}${leafPart}`
}

async function getSmsTemplateMessage(type: number): Promise<string | null> {
  const model = (prisma as { smsTemplate?: { findFirst: (args: object) => Promise<{ message: string } | null> } })
    .smsTemplate
  if (!model) return null
  const template = await model.findFirst({
    where: { type, status: 1 },
    select: { message: true },
    orderBy: { updatedAt: "desc" },
  })
  return template?.message?.trim() ?? null
}
/**
 * Create a new booking for a session. Validates session, discounts, amount, agency (if any),
 * then allocates appointment no, creates booking, optionally creates receipt for POS/Agent,
 * and notifies real-time clients.
 */
export async function saveBookingService(
  input: SaveBookingInput,
  userId: string | null,
  options?: SaveBookingServiceOptions
): Promise<SaveBookingServiceResult> {
  const shouldRequireShift = options?.requireActiveShift !== false
  const settleOnCreate = options?.settleOnCreate !== false
  if (userId && shouldRequireShift) await requireActiveShift(userId)

  const sessionId = input.session.id

  const { session, isPast } = await loadSessionForSaveBooking(sessionId)
  if (!session) {
    return {
      success: false,
      errorCode: "INVALID_SESSION",
      message: "Session not found.",
    }
  }
  if (isPast) {
    return {
      success: false,
      errorCode: "SERVER_ERROR",
      message: "Cannot Book Past Sessions.",
    }
  }

  // Consecutive session rule: if this session has a previous session, it must be full before booking here
  if (session.previousDoctorSession) {
    const previousFull = await checkConsecutiveSessionFull(sessionId)
    if (!previousFull) {
      return {
        success: false,
        errorCode: "PREVIOUS_SESSION_FILL",
        message: "Previous session must be filled first before booking here.",
      }
    }
  }

  if (input.discount_type) {
    // Voucher schemes require a valid code before we apply the discount.
    const discountRecord = await prisma.discount.findUnique({
      where: { id: input.discount_type },
      select: { isVoucher: true },
    })
    if (discountRecord?.isVoucher === 1) {
      const voucherCode = (input.voucher_code ?? "").trim()
      if (!voucherCode) {
        return {
          success: false,
          errorCode: "DISCOUNT_ERROR",
          message: "Voucher code is required for this discount scheme.",
        }
      }
      const voucherValidation = await validateVoucherForDiscount(
        voucherCode,
        input.discount_type
      )
      if (!voucherValidation.valid) {
        return {
          success: false,
          errorCode: "DISCOUNT_ERROR",
          message: voucherValidation.message ?? "Invalid voucher code.",
        }
      }
    }
  }

  const discountResult = await computeBookingDiscounts({
    autoDiscountId: input.auto_discount_type ?? null,
    manualDiscountId: input.discount_type ?? null,
    payment_method: input.payment_method,
    payment_type: input.payment_type,
    session,
    foriegner: input.foriegner,
    strict: true,
  })
  if (!discountResult.success) {
    return {
      success: false,
      errorCode: "DISCOUNT_ERROR",
      message: discountResult.message,
    }
  }
  const totalDiscount = discountResult.discount_value
  const hospitalFeeDiscount = discountResult.hospital_fee_discount
  const professionsalFeeDiscount = discountResult.professionsal_fee_discount
  const otherDiscount = discountResult.other_discount

  // Reject if client-submitted discount total doesn't match server calculation.
  if (input.discount !== totalDiscount) {
    return {
      success: false,
      errorCode: "DISCOUNT_ERROR",
      message: "Error on front-end Discounts while Processing.",
    }
  }

  const { professional_fee, hospital_fee } = getRefundFeeTypes(
    session.fees,
    input.foriegner
  )

  const baseAmount = professional_fee + hospital_fee
  const expectedAmount = Math.round((baseAmount - totalDiscount) * 100) / 100
  const inputAmountNum = Number(input.amount)
  if (toCents(inputAmountNum) !== toCents(expectedAmount)) {
    const msg = `Amount does not match server calculation. Received: ${inputAmountNum}, expected: ${expectedAmount}. Please refresh and try again.`
    if (process.env.NODE_ENV !== "production") {
      console.log("[save-booking] amountError", { received: inputAmountNum, expected: expectedAmount, baseAmount, totalDiscount })
    }
    return {
      success: false,
      errorCode: "AMOUNT_ERROR",
      message: msg,
    }
  }
  const amountToUse = expectedAmount

  // Credit Customer booking: require credit customer to be selected.
  if (input.payment_type === 5 && !input.credit_customer?.id) {
    return {
      success: false,
      errorCode: "INVALID_INPUT",
      message: "Credit Customer is required for this payment type.",
    }
  }
  if (input.payment_type === SAVE_PAYMENT_TYPE_E_WALLET && !input.ewallet_ref?.trim()) {
    return {
      success: false,
      errorCode: "INVALID_INPUT",
      message: "E-wallet reference is required for E-wallet payment.",
    }
  }

  // Agent booking: verify agency ref, ensure linked account exists for balance check, and that credit limit is not exceeded.
  const normalizedAgencyRef = options?.agencyRefUniqueOnly
    ? (input.agency_ref ?? "").toUpperCase().trim()
    : await buildNormalizedAgencyRef(input)
  if (input.agency?.id) {
    const ref = normalizedAgencyRef
    const refResult = await verifyAgencyReferenceWithReason(ref, input.agency.id, {
      uniqueOnly: options?.agencyRefUniqueOnly,
    })
    if (!refResult.valid) {
      return {
        success: false,
        errorCode: "AGENCY_REF_ERROR",
        message: refResult.reason ?? "Agency Reference Error.",
      }
    }
    const agency = await prisma.agency.findUnique({
      where: { id: input.agency.id },
      select: {
        allowedCreditLimit: true,
        accounts: {
          where: { type: "PAYABLE", isActive: true },
          take: 1,
          select: { id: true },
        },
      },
    })
    const hasLinkedAccount = agency?.accounts?.[0] != null
    if (!hasLinkedAccount) {
      return {
        success: false,
        errorCode: "AGENCY_NO_LINKED_ACCOUNT",
        message:
          "This booking cannot be saved because the agency has no linked account. Balance cannot be checked. Please link a PAYABLE account to the agency.",
      }
    }
    const allowedCreditLimit = agency?.allowedCreditLimit ?? 0
    const balanceCents = await getAgentBalance(input.agency.id)
    /** PAYABLE signed balance (rupees): positive = prepaid with us; may be negative if over limit. */
    const balanceRupees = balanceCents / 100

    // Soft limit: booking amount must not exceed prepaid balance + allowed credit line (not sum vs limit alone).
    // (Legacy RECEIVABLE compared limit to amount+balance when prepaid showed negative; PAYABLE needs this form.)
    if (amountToUse > balanceRupees + allowedCreditLimit) {
      return {
        success: false,
        errorCode: "CREDIT_LIMIT_VIOLATION",
        message:
          "Booking exceeds the agency's allowed credit limit. Please complete a deposit or adjust the booking amount.",
      }
    }
  }

  const sessionDate = session.date instanceof Date ? session.date : new Date(session.date)
  const startDate = normalizeSessionTime(session.startTime as Date | number, sessionDate)
  const endDate = normalizeSessionTime(session.endTime as Date | number, sessionDate)
  const sessionStartTime = Math.floor(startDate.getTime() / 1000)
  const sessionEndTime = Math.floor(endDate.getTime() / 1000)

  const discountDivision = {
    hospital_fee_discount: hospitalFeeDiscount,
    professionsal_fee_discount: professionsalFeeDiscount,
    other_discount: otherDiscount,
  }

  // Booking ID / bill number is location-scoped and used for display and receipts.
  const locationId = session.locationId ?? session.location?.id ?? null
  const { scopeKey, formatBookingIdString } = await getBookingSequenceInfo(locationId)
  const bookingSeqResult = await getNextSequenceNumber(scopeKey, { startFrom: 1 })
  const bookingid = bookingSeqResult.success ? bookingSeqResult.value : null
  const bookingid_string =
    bookingid != null ? formatBookingIdString(bookingid) : null

  // Pre-check: agent/credit customer — ensure posting the receipt would not exceed account minBalanceAllowed (credit limit).
  // Fail before creating the booking so we don't create a pending booking that cannot be completed.
  if (settleOnCreate && CREATE_RECEIPT_METHODS.includes(input.payment_method)) {
    const isAgent = input.payment_type === 4
    const isCreditCustomer = input.payment_type === 5
    if (isAgent || isCreditCustomer) {
      const receiptAmount = amountToUse
      const needTill = false
      const reqResult = await requireReceiptJournalAccounts(
        {
          locationId,
          createdBy: userId,
          agencyId: input.agency?.id ?? null,
          creditCustomerId: input.credit_customer?.id ?? null,
          doctorId: session.doctorId ?? input.doctor?.id ?? null,
          needTill,
        },
        { needTill, isAgent, isCreditCustomer }
      )
      if (!reqResult.success) {
        return {
          success: false,
          errorCode: reqResult.errorCode as SaveBookingErrorCode,
          message: reqResult.error,
        }
      }
      const accounts = reqResult.accounts
      const amountCents = Math.round(receiptAmount * 100)
      const hospitalFeeAfterDiscount = Math.max(0, hospital_fee - hospitalFeeDiscount)
      const professionalFeeAfterDiscount = Math.max(0, professional_fee - professionsalFeeDiscount)
      const channelPaymentFeeSplit =
        accounts.doctorAccountId && amountCents > 0
          ? {
              hospitalFeeCents: Math.min(Math.round(hospitalFeeAfterDiscount * 100), amountCents),
              professionalFeeCents: 0,
            }
          : undefined
      if (channelPaymentFeeSplit) {
        channelPaymentFeeSplit.professionalFeeCents = amountCents - channelPaymentFeeSplit.hospitalFeeCents
      }
      const dummyReceipt = {
        amount: receiptAmount,
        method: 1,
        paymentMethod: input.payment_type,
        id: '',
        createdAt: new Date(),
        receiptNoString: '',
        locationId,
        userLocationId: null,
        createdBy: userId,
      } as Parameters<typeof buildReceiptJournalEntryInput>[0]
      const journalInput = buildReceiptJournalEntryInput(dummyReceipt, accounts, channelPaymentFeeSplit)
      if (journalInput) {
        const balanceCheck = await checkJournalEntryBalance(journalInput)
        if (!balanceCheck.allowed) {
          return {
            success: false,
            errorCode: 'INSUFFICIENT_BALANCE' as SaveBookingErrorCode,
            message: balanceCheck.error,
          }
        }
      }
    }
  }

  // Pre-check: if this booking/payment method needs a till (cash/card/slip/check/e-wallet),
  // validate till account creation before creating a pending booking row.
  if (settleOnCreate && CREATE_RECEIPT_METHODS.includes(input.payment_method)) {
    const isAgent = input.payment_type === 4
    const isCreditCustomer = input.payment_type === 5
    const needTill = [0, 1, 2, 3, 6, SAVE_PAYMENT_TYPE_MIXED].includes(input.payment_type)

    if (needTill) {
      const reqResult = await requireReceiptJournalAccounts(
        {
          locationId,
          createdBy: userId,
          agencyId: input.agency?.id ?? null,
          creditCustomerId: input.credit_customer?.id ?? null,
          doctorId: session.doctorId ?? input.doctor?.id ?? null,
          needTill,
        },
        { needTill, isAgent, isCreditCustomer }
      )

      if (!reqResult.success) {
        return {
          success: false,
          errorCode: reqResult.errorCode as SaveBookingErrorCode,
          message: reqResult.error,
        }
      }
    }
  }

  const bookingCreateBase = {
    title: input.title,
    name: input.name.toUpperCase(),
    phone: input.phone,
    sex: input.sex,
    area: input.area.name,
    remarks: input.remarks ?? "",
    method: input.payment_method,
    sessionId,
    doctorId: input.doctor.id,
    amount: amountToUse,
    discount: totalDiscount,
    foriegner: input.foriegner,
    status: 0,
    createdBy: userId,
    fees: session.fees as object,
    refund: 0,
    refundAmount: 0,
    agencyRef: normalizedAgencyRef,
    agencyId: input.agency?.id ?? null,
    creditCustomerId: input.credit_customer?.id ?? null,
    staffId: input.staff?.id ?? null,
    discountDivision,
    hospitalFeeDiscount,
    professionsalFeeDiscount,
    professionalFee: professional_fee,
    hospitalFee: hospital_fee,
    referredDoctorId: input.referred_doctor?.id ?? null,
    referredAgencyId: input.referred_agency?.id ?? null,
    referredStaffId: input.referred_staff?.id ?? null,
    sessionStartTime,
    sessionEndTime,
    isScan: session.isScan,
    locationId,
    bookingid,
    bookingid_string,
    discountId: input.discount_type ?? null,
    autoDiscountId: input.auto_discount_type ?? null,
  }

  const MAX_APPOINTMENT_TX_ATTEMPTS = 2
  let created: {
    booking: Awaited<ReturnType<typeof prisma.booking.create>>
    appointmentNo: number
  } | null = null
  let clearedBlockedAppointmentNo: number | null = null

  try {
    for (let attempt = 0; attempt < MAX_APPOINTMENT_TX_ATTEMPTS; attempt++) {
      try {
        const txOut = await prisma.$transaction(async (tx) => {
          const sessionRow = await tx.session.findUnique({
            where: { id: sessionId },
            select: {
              appointmentNo: true,
              startingPatientNumber: true,
              maxPatientNumber: true,
              blockedAppointmentNumbers: true,
            },
          })
          if (!sessionRow) {
            return { kind: "session_not_found" as const }
          }
          const prep = await prepareAppointmentNumberForNewBookingTx(tx, sessionId, sessionRow, {
            forcedAppointmentNo: input.forcedAppointmentNo ?? null,
            forceAppointmentNo: input.forceAppointmentNo === true,
          })
          if (!prep.ok) {
            return { kind: "prep_fail" as const, prep }
          }
          const b = await tx.booking.create({
            data: {
              ...bookingCreateBase,
              appointmentNo: prep.appointmentNo,
            },
          })
          await advanceAppointmentSequenceCursor(tx, sessionId, prep.appointmentNo)

          const blockedBefore = sessionRow.blockedAppointmentNumbers ?? []
          let clearedBlocked: number | null = null
          let nextBlockedList: number[] | undefined
          if (
            input.forceAppointmentNo === true &&
            blockedBefore.includes(prep.appointmentNo)
          ) {
            clearedBlocked = prep.appointmentNo
            nextBlockedList = blockedBefore
              .filter((x) => x !== prep.appointmentNo)
              .sort((a, b) => a - b)
          }

          await tx.session.update({
            where: { id: sessionId },
            data: {
              appointmentNo: Math.max(sessionRow.appointmentNo, prep.appointmentNo),
              ...(nextBlockedList !== undefined ? { blockedAppointmentNumbers: nextBlockedList } : {}),
            },
          })
          return {
            kind: "ok" as const,
            booking: b,
            appointmentNo: prep.appointmentNo,
            clearedBlockedAppointmentNo: clearedBlocked,
          }
        })
        if (txOut.kind === "prep_fail") {
          const m = mapPrepareAppointmentFailure(txOut.prep)
          return { success: false, errorCode: m.errorCode, message: m.message }
        }
        if (txOut.kind === "session_not_found") {
          return { success: false, errorCode: "INVALID_SESSION", message: "Session not found." }
        }
        created = { booking: txOut.booking, appointmentNo: txOut.appointmentNo }
        clearedBlockedAppointmentNo = txOut.clearedBlockedAppointmentNo
        break
      } catch (e: unknown) {
        if (attempt < MAX_APPOINTMENT_TX_ATTEMPTS - 1 && isPrismaUniqueConstraintError(e)) {
          continue
        }
        throw e
      }
    }

    if (!created) {
      return {
        success: false,
        errorCode: "SERVER_ERROR",
        message: "Could not assign a unique appointment number. Please try again.",
      }
    }
    const booking = created.booking
    const appointmentNo = created.appointmentNo

    // POS and Agent create a receipt and mark booking as paid (status 1); Credit Customer and E-wallet also create receipt (booked).
    if (settleOnCreate && CREATE_RECEIPT_METHODS.includes(input.payment_method)) {
      const receiptAmount = amountToUse
      const remarks =
        input.payment_type === 4
          ? "AGENT PAYMENT"
          : input.payment_type === 5
            ? "CREDIT CUSTOMER PAYMENT"
            : input.payment_type === 6
              ? "E-WALLET PAYMENT"
              : "POS PAYMENT"
      const isCash = input.payment_type === 0
      const isAgent = input.payment_type === 4
      const isCreditCustomer = input.payment_type === 5
      const isMixed = input.payment_type === SAVE_PAYMENT_TYPE_MIXED
      const needTill = [0, 1, 2, 3, 6, SAVE_PAYMENT_TYPE_MIXED].includes(input.payment_type) // mixed uses till split lines
      const needJournal = needTill || isAgent || isCreditCustomer
      const mixedLinesResult = buildMixedLinesFromSaveInput(input, receiptAmount)
      if (mixedLinesResult?.error) {
        return {
          success: false,
          errorCode: "INVALID_INPUT",
          message: mixedLinesResult.error,
        }
      }
      const paymentLines = mixedLinesResult?.lines
      try {
        let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
        if (needJournal) {
          const reqResult = await requireReceiptJournalAccounts(
            {
              locationId: booking.locationId ?? null,
              createdBy: userId,
              agencyId: input.agency?.id ?? null,
              creditCustomerId: input.credit_customer?.id ?? null,
              doctorId: session.doctorId ?? input.doctor?.id ?? null,
              needTill,
            },
            { needTill, isAgent, isCreditCustomer }
          )
          if (!reqResult.success) {
            return {
              success: false,
              errorCode: reqResult.errorCode as SaveBookingErrorCode,
              message: reqResult.error,
            }
          }
          accounts = reqResult.accounts
        } else {
          const resolveResult = await resolveReceiptJournalAccounts({
            locationId: booking.locationId ?? null,
            createdBy: userId,
            agencyId: input.agency?.id ?? null,
            creditCustomerId: input.credit_customer?.id ?? null,
            doctorId: session.doctorId ?? input.doctor?.id ?? null,
            needTill,
          })
          if (isResolveReceiptJournalAccountsError(resolveResult)) {
            return {
              success: false,
              errorCode: resolveResult.errorCode as SaveBookingErrorCode,
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

        const result = await prisma.$transaction(
          async (tx) => {
          const r = await createReceiptAndUpdateBooking(tx, {
            bookingId: booking.id,
            locationId: booking.locationId ?? null,
            receiptSequenceMethod: 1, // PAYMENT RECEIPTS
            paymentMethod: input.payment_type,
            amount: receiptAmount,
            bank: input.bank?.name ?? "",
            bankId: input.bank?.id ?? null,
            cardReference:
              input.payment_type === SAVE_PAYMENT_TYPE_E_WALLET
                ? (input.ewallet_ref ?? "")
                : (input.card ?? ""),
            slipReference: input.slip_ref ?? "",
            remarks,
            type: 1,
            method: 1,
            agencyId: input.agency?.id ?? null,
            creditCustomerId: input.credit_customer?.id ?? null,
            createdBy: userId,
            shiftId,
            userLocationId: null,
            paymentLines,
            getBookingUpdate: (receipt) => ({
              status: 1,
              receiptNo: receipt.receiptNo,
              receiptNoString: receipt.receiptNoString,
              receiptPaymentMethod: isMixed ? SAVE_PAYMENT_TYPE_MIXED : input.payment_type,
              receiptNoCreatedAt: receipt.createdAt,
              receiptNoId: receipt.id,
              updatedBy: userId,
            }),
          })
          if (!r.success) throw new Error(r.message)
          const receipt = r.receipt
          if (accounts && journalNumber > 0) {
            const amountCents = Math.round(receiptAmount * 100)
            const hospitalFeeAfterDiscount = Math.max(0, hospital_fee - hospitalFeeDiscount)
            const professionalFeeAfterDiscount = Math.max(0, professional_fee - professionsalFeeDiscount)
            const channelPaymentFeeSplit =
              accounts.doctorAccountId && amountCents > 0
                ? {
                    hospitalFeeCents: Math.min(Math.round(hospitalFeeAfterDiscount * 100), amountCents),
                    professionalFeeCents: 0,
                  }
                : undefined
            if (channelPaymentFeeSplit) {
              channelPaymentFeeSplit.professionalFeeCents = amountCents - channelPaymentFeeSplit.hospitalFeeCents
            }
            const journalInput = buildReceiptJournalEntryInput(receipt, accounts, channelPaymentFeeSplit)
            // Agent and Credit Customer require a journal (receivable must be updated); fail the transaction if none produced
            if ((isAgent || isCreditCustomer) && !journalInput) {
              throw new Error(
                isCreditCustomer
                  ? "Credit customer account or journal setup failed. Cannot complete booking."
                  : "Agent account or journal setup failed. Cannot complete booking."
              )
            }
            if (journalInput) {
              const jResult = await createJournalEntryInTransaction(tx, journalInput, journalNumber)
              if (!jResult.success) {
                const err = new Error(jResult.error) as Error & { errorCode?: string }
                err.errorCode = jResult.errorCode ?? 'INSUFFICIENT_BALANCE'
                throw err
              }
            }
          }
          return receipt
        },
          { timeout: 15000 }
        )
        if (needTill && userId) {
          const io = getIO()
          if (io) io.to(floatBalanceRoom(userId)).emit("float-balance-update", {})
        }
        if (input.agency?.id) {
            const updateBalanceResult = await updateAgentBalance(input.agency.id, -receiptAmount)
            // SMS: agency balance after booking (template type 4), only if agency has sendSms and phone
            const agencyDetails = await prisma.agency.findUnique({
              where: { id: input.agency.id },
              select: { sendSms: true, phone: true },
            })
            if (agencyDetails?.sendSms === 1 && agencyDetails.phone?.trim()) {
              const templateMessage =
                (await getSmsTemplateMessage(SMS_TEMPLATE_TYPE_AGENCY_BALANCE)) ?? DEFAULT_AGENCY_BALANCE_MESSAGE
              const doctorName = [input.doctor.title, input.doctor.name].filter(Boolean).join(" ")
              const dateStr = moment(sessionDate).format("DD/MM/YYYY")
              const timeStr = moment(startDate).format("HH:mm")
              const amountDisplay = (amountToUse - totalDiscount).toLocaleString("en-US", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })
              const balanceDisplay = updateBalanceResult.balance.toLocaleString("en-US", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })
              const text = templateMessage
                .replace(/{agency_ref}/g, normalizedAgencyRef)
                .replace(/{doctor}/g, doctorName)
                .replace(/{appointment_no}/g, String(appointmentNo).padStart(2, "0"))
                .replace(/{date}/g, dateStr)
                .replace(/{time}/g, timeStr)
                .replace(/{amount}/g, amountDisplay)
                .replace(/{balance}/g, balanceDisplay)
              await sendSms(agencyDetails.phone.trim(), text, { logName: "Agency Balance" })
            }
          }
        } catch (receiptErr) {
          console.error("saveBookingService receipt create error", receiptErr)
          const err = receiptErr as Error & { errorCode?: string }
          if (err?.errorCode === 'INSUFFICIENT_BALANCE') {
            return {
              success: false,
              errorCode: 'INSUFFICIENT_BALANCE' as SaveBookingErrorCode,
              message: err.message ?? 'Credit limit exceeded. This booking would exceed the allowed limit for this account.',
            }
          }
          return {
            success: false,
            errorCode: "SERVER_ERROR",
            message:
              err?.message ?? 'Failed to create receipt. The booking was created as pending; you can try settling it later.',
          }
        }
    }

    const fullBooking = await getBookingForSaveBooking(booking.id)

    // Notify real-time listeners so sessions list updates (appointmentNo, paidCount, pendingCount)
    const doctorId = session.doctorId ?? null
    if (doctorId) {
      if (clearedBlockedAppointmentNo != null) {
        await emitSessionUpdateAfterBlocks(sessionId)
        if (userId) {
          logActivityNonBlocking({
            userId,
            action: "session.appointment_blocks_removed",
            entityType: "Session",
            entityId: sessionId,
            importance: "low",
            metadata: {
              numbers: [clearedBlockedAppointmentNo],
              operation: "remove" as const,
              reason: "forced_booking",
            },
          })
        }
      } else {
        const [paidCount, pendingCount] = await Promise.all([
          prisma.booking.count({ where: { sessionId, status: 1 } }),
          prisma.booking.count({ where: { sessionId, status: 0 } }),
        ])
        const io = getIO()
        if (io) {
          const room = channelBookingRoom(doctorId)
          const socketsInRoom = await io.in(room).fetchSockets()
          if (process.env.NODE_ENV !== "production") {
            console.log("[save-booking] session-update emitted", {
              room,
              sessionId,
              appointmentNo,
              paidCount,
              pendingCount,
              clientsInRoom: socketsInRoom.length,
            })
          }
          io.to(room).emit("session-update", {
            sessionId,
            appointmentNo,
            paidCount,
            pendingCount,
          })
        } else if (process.env.NODE_ENV !== "production") {
          console.log("[save-booking] session-update skipped: getIO() is null (not using custom server?)")
        }
      }
    }

    return { success: true, data: fullBooking }
  } catch (e) {
    console.error("saveBookingService create error", e)
    // Return generic message; actual failure may be DB, sequence, or other.
    return {
      success: false,
      errorCode: "LIMIT_EXCEEDED",
      message: "Appointment Limit Exceed.",
    }
  }
}
