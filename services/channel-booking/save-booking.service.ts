import prisma from "@/lib/prisma"
import moment from "moment"
import { normalizeSessionTime } from "@/lib/utils"
import type { SaveBookingInput, SaveBookingErrorCode } from "@/types/save-booking"
import { getIO, channelBookingRoom, floatBalanceRoom } from "@/lib/socket-server"
import { sendSms } from "@/lib/helpers/sms/send-sms"
import {
  createReceiptAndUpdateBooking,
  loadSessionForSaveBooking,
  checkConsecutiveSessionFull,
  getProcessedDiscount,
  getRefundFeeTypes,
  verifyAgencyReferenceWithReason,
  getAgentBalance,
  getBookingForSaveBooking,
  getNextSequenceNumber,
  updateAgentBalance,
  validateVoucherForDiscount,
  getBookingSequenceInfo,
  buildReceiptJournalEntryInput,
  resolveReceiptJournalAccounts,
  requireReceiptJournalAccounts,
} from "./helpers"
import { createJournalEntryInTransaction } from "@/services/accounting.service"

export type SaveBookingServiceResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: SaveBookingErrorCode; message: string }

/** Spec §10: Create receipt for POS (0) or Agent (2); then set booking status 1 (booked). OnCall (1) does not create receipt. */
const CREATE_RECEIPT_METHODS = [0, 2] // POS, Agent

/** SMS template type 4 = Agent Balance Message after Booking Agent Channel. Placeholders: {agency_ref}, {doctor}, {appointment_no}, {date}, {time}, {amount}, {balance}. */
const SMS_TEMPLATE_TYPE_AGENCY_BALANCE = 4
const DEFAULT_AGENCY_BALANCE_MESSAGE =
  "Ref: {agency_ref}. Booking with Dr {doctor}, appointment no {appointment_no}, date {date}, time {time}. Amount: {amount}. Your balance: {balance}."

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
  userId: string | null
): Promise<SaveBookingServiceResult> {
  const sessionId = input.session.id

  const { session, isPast } = await loadSessionForSaveBooking(sessionId)
  if (!session) {
    return {
      success: false,
      errorCode: "invalid_session",
      message: "Session not found.",
    }
  }
  if (isPast) {
    return {
      success: false,
      errorCode: "server_error",
      message: "Cannot Book Past Sessions.",
    }
  }

  // Consecutive session rule: if this session has a previous session, it must be full before booking here
  if (session.previousDoctorSession) {
    const previousFull = await checkConsecutiveSessionFull(sessionId)
    if (!previousFull) {
      return {
        success: false,
        errorCode: "previousessionfill",
        message: "Previous session must be filled first before booking here.",
      }
    }
  }

  // Apply auto discount first, then manual (including voucher) if present.
  let totalDiscount = 0
  let hospitalFeeDiscount = 0
  let professionsalFeeDiscount = 0
  let otherDiscount = 0

  if (input.auto_discount_type) {
    const result = await getProcessedDiscount(
      input.auto_discount_type,
      input.payment_method,
      input.payment_type,
      session,
      input.foriegner
    )
    if (!result.status) {
      return {
        success: false,
        errorCode: "discountError",
        message: result.message ?? "Auto discount error.",
      }
    }
    totalDiscount += result.discount_value
    hospitalFeeDiscount += result.hospital_fee_discount
    professionsalFeeDiscount += result.professionsal_fee_discount
    otherDiscount += result.other_discount
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
          errorCode: "discountError",
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
          errorCode: "discountError",
          message: voucherValidation.message ?? "Invalid voucher code.",
        }
      }
    }
    const result = await getProcessedDiscount(
      input.discount_type,
      input.payment_method,
      input.payment_type,
      session,
      input.foriegner
    )
    if (!result.status) {
      return {
        success: false,
        errorCode: "discountError",
        message: result.message ?? "Discount error.",
      }
    }
    totalDiscount += result.discount_value
    hospitalFeeDiscount += result.hospital_fee_discount
    professionsalFeeDiscount += result.professionsal_fee_discount
    otherDiscount += result.other_discount
  }

  // Reject if client-submitted discount total doesn't match server calculation.
  if (input.discount !== totalDiscount) {
    return {
      success: false,
      errorCode: "discountError",
      message: "Error on front-end Discounts while Processing.",
    }
  }

  const { professional_fee, hospital_fee } = getRefundFeeTypes(
    session.fees,
    input.foriegner
  )

  const baseAmount = professional_fee + hospital_fee
  const expectedAmount = Math.round(baseAmount - totalDiscount)
  const inputAmountNum = Number(input.amount)
  const amountTolerance = 1 // Allow Rs 1 rounding difference between client and server.
  if (Math.abs(inputAmountNum - expectedAmount) > amountTolerance) {
    const msg = `Amount does not match server calculation. Received: ${inputAmountNum}, expected: ${expectedAmount}. Please refresh and try again.`
    if (process.env.NODE_ENV !== "production") {
      console.log("[save-booking] amountError", { received: inputAmountNum, expected: expectedAmount, baseAmount, totalDiscount })
    }
    return {
      success: false,
      errorCode: "amountError",
      message: msg,
    }
  }
  const amountToUse = expectedAmount

  // Credit Customer booking: require credit customer to be selected.
  if (input.payment_type === 5 && !input.credit_customer?.id) {
    return {
      success: false,
      errorCode: "invalid_input",
      message: "Credit Customer is required for this payment type.",
    }
  }

  // Agent booking: verify agency ref and that agency credit limit is not exceeded.
  if (input.agency?.id) {
    const ref = (input.agency_ref ?? "").toUpperCase().trim()
    const refResult = await verifyAgencyReferenceWithReason(ref, input.agency.id)
    if (!refResult.valid) {
      return {
        success: false,
        errorCode: "agencyRefError",
        message: refResult.reason ?? "Agency Reference Error.",
      }
    }
    const agency = await prisma.agency.findUnique({
      where: { id: input.agency.id },
      select: { allowedCreditLimit: true },
    })
    const creditLimit = agency?.allowedCreditLimit ?? 0
    const balance = await getAgentBalance(input.agency.id)
    if (creditLimit + balance < amountToUse) {
      return {
        success: false,
        errorCode: "agencyCreditExceed",
        message: "Exceed Agency Credit Limit.",
      }
    }
  }

  // Allocate next appointment number for this session (atomic; respects maxPatientNumber).
  const appointmentResult = await getNextSequenceNumber(
    `appointment:${sessionId}`,
    {
      startFrom: session.startingPatientNumber,
      max: session.maxPatientNumber,
    }
  )
  if (!appointmentResult.success) {
    return {
      success: false,
      errorCode: "limitexceeded",
      message: "Appointment Limit Exceed.",
    }
  }
  const appointmentNo = appointmentResult.value

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

  try {
    const booking = await prisma.booking.create({
      data: {
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
        agencyRef: (input.agency_ref ?? "").toUpperCase(),
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
        appointmentNo,
        discountId: input.discount_type ?? null,
        autoDiscountId: input.auto_discount_type ?? null,
      },
    })

    // Keep Session.appointmentNo in sync so the session list and consecutive-session rule
    // can read the current "last assigned" number without counting bookings.
    await prisma.session.update({
      where: { id: sessionId },
      data: { appointmentNo },
    })

    // POS and Agent create a receipt and mark booking as paid (status 1); Credit Customer and E-wallet also create receipt (booked).
    if (CREATE_RECEIPT_METHODS.includes(input.payment_method)) {
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
      const needTill = [0, 1, 2, 3, 6].includes(input.payment_type) // cash, card, slip, check, e-wallet (not agent, not credit customer)
      const needJournal = needTill || isAgent || isCreditCustomer
      try {
        let accounts: Awaited<ReturnType<typeof resolveReceiptJournalAccounts>>
        if (needJournal) {
          const reqResult = await requireReceiptJournalAccounts(
            {
              locationId: booking.locationId ?? null,
              createdBy: userId,
              agencyId: input.agency?.id ?? null,
              creditCustomerId: input.credit_customer?.id ?? null,
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
          accounts = await resolveReceiptJournalAccounts({
            locationId: booking.locationId ?? null,
            createdBy: userId,
            agencyId: input.agency?.id ?? null,
            creditCustomerId: input.credit_customer?.id ?? null,
            needTill,
          })
        }
        const journalNumberResult = accounts
          ? await getNextSequenceNumber("journal", { startFrom: 1 })
          : null
        const journalNumber = journalNumberResult?.success ? journalNumberResult.value : 0

        const result = await prisma.$transaction(async (tx) => {
          const r = await createReceiptAndUpdateBooking(tx, {
            bookingId: booking.id,
            locationId: booking.locationId ?? null,
            receiptSequenceMethod: 1, // PAYMENT RECEIPTS
            paymentMethod: input.payment_type,
            amount: receiptAmount,
            bank: input.bank?.name ?? "",
            bankId: input.bank?.id ?? null,
            cardReference: input.card ?? "",
            slipReference: input.slip_ref ?? "",
            remarks,
            type: 1,
            method: 1,
            agencyId: input.agency?.id ?? null,
            creditCustomerId: input.credit_customer?.id ?? null,
            createdBy: userId,
            userLocationId: null,
            getBookingUpdate: (receipt) => ({
              status: 1,
              receiptNo: receipt.receiptNo,
              receiptNoString: receipt.receiptNoString,
              receiptPaymentMethod: input.payment_type,
              receiptNoCreatedAt: receipt.createdAt,
              receiptNoId: receipt.id,
              updatedBy: userId,
            }),
          })
          if (!r.success) throw new Error(r.message)
          const receipt = r.receipt
          if (accounts && journalNumber > 0) {
            const journalInput = buildReceiptJournalEntryInput(receipt, accounts)
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
              if (!jResult.success) throw new Error(jResult.error)
            }
          }
          return receipt
        })
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
                .replace(/{agency_ref}/g, (input.agency_ref ?? "").toUpperCase())
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
          // Booking remains status 0 (pending); user can settle later.
        }
    }

    const fullBooking = await getBookingForSaveBooking(booking.id)

    // Notify real-time listeners so sessions list updates (appointmentNo, paidCount, pendingCount)
    const doctorId = session.doctorId ?? null
    if (doctorId) {
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

    return { success: true, data: fullBooking }
  } catch (e) {
    console.error("saveBookingService create error", e)
    // Return generic message; actual failure may be DB, sequence, or other.
    return {
      success: false,
      errorCode: "limitexceeded",
      message: "Appointment Limit Exceed.",
    }
  }
}
