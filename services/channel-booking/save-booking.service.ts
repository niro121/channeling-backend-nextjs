import prisma from "@/lib/prisma"
import { normalizeSessionTime } from "@/lib/utils"
import type { SaveBookingInput, SaveBookingErrorCode } from "@/types/save-booking"
import {
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
} from "./helpers"

export type SaveBookingServiceResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: SaveBookingErrorCode; message: string }

/** Spec §10: Create receipt for POS (0) or Agent (2); then set booking status 1 (booked). OnCall (1) does not create receipt. */
const CREATE_RECEIPT_METHODS = [0, 2] // POS, Agent
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
    if (creditLimit + balance < input.amount) {
      return {
        success: false,
        errorCode: "agencyCreditExceed",
        message: "Exceed Agency Credit Limit.",
      }
    }
  }

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
        amount: input.amount,
        discount: totalDiscount,
        foriegner: input.foriegner,
        status: 0,
        createdBy: userId,
        fees: session.fees as object,
        refund: 0,
        refundAmount: 0,
        agencyRef: (input.agency_ref ?? "").toUpperCase(),
        agencyId: input.agency?.id ?? null,
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
        locationId: session.locationId ?? session.location?.id ?? null,
        appointmentNo,
        discountId: input.discount_type ?? null,
        autoDiscountId: input.auto_discount_type ?? null,
      },
    })

    await prisma.session.update({
      where: { id: sessionId },
      data: { appointmentNo },
    })

    if (CREATE_RECEIPT_METHODS.includes(input.payment_method)) {
      const receiptAmount = Math.round(Number(input.amount) - totalDiscount)
      const scopeKey = `receipt:${booking.locationId ?? "global"}`
      const seqResult = await getNextSequenceNumber(scopeKey)
      if (seqResult.success) {
        const receiptNo = seqResult.value
        const receiptNoString = `REC-${String(receiptNo).padStart(8, "0")}`
        const remarks =
          input.payment_method === 0 ? "POS PAYMENT" : "AGENT PAYMENT"
        try {
          const newReceipt = await prisma.receipt.create({
            data: {
              receiptNo,
              receiptNoString,
              paymentMethod: input.payment_type,
              amount: receiptAmount,
              bank: input.bank?.name ?? "",
              bankId: input.bank?.id ?? null,
              cardReference: input.card ?? "",
              slipReference: input.slip_ref ?? "",
              remarks,
              type: 1,
              method: 1,
              whd: 0,
              whdPercentage: 0,
              bookingId: booking.id,
              agencyId: input.agency?.id ?? null,
              createdBy: userId,
              locationId: booking.locationId ?? null,
              userLocationId: null,
            },
          })
          if (input.agency?.id) {
            await updateAgentBalance(input.agency.id, -receiptAmount)
          }
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: 1,
              receiptNo: newReceipt.receiptNo,
              receiptNoString: newReceipt.receiptNoString,
              receiptPaymentMethod: input.payment_type,
              receiptNoCreatedAt: newReceipt.createdAt,
              receiptNoId: newReceipt.id,
              updatedBy: userId,
            },
          })
        } catch (receiptErr) {
          console.error("saveBookingService receipt create error", receiptErr)
          // Booking remains status 0 (pending)
        }
      }
    }

    const fullBooking = await getBookingForSaveBooking(booking.id)
    return { success: true, data: fullBooking }
  } catch (e) {
    console.error("saveBookingService create error", e)
    return {
      success: false,
      errorCode: "limitexceeded",
      message: "Appointment Limit Exceed.",
    }
  }
}
