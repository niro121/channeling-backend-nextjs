import prisma from "@/lib/prisma"
import type { SaveBookingInput, SaveBookingErrorCode } from "@/types/save-booking"
import {
  loadSessionForSaveBooking,
  // checkConsecutiveSessionFull,
  getProcessedDiscount,
  getRefundFeeTypes,
  verifyAgencyReference,
  getAgentBalance,
  getBookingForSaveBooking,
  getNextSequenceNumber,
} from "./helpers"

export type SaveBookingServiceResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: SaveBookingErrorCode; message: string }

/**
 * Save booking: validate, run business rules, create booking, return full booking.
 * Does not create receipt, update agency balance, or send SMS (phase 2).
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
      message: "Cannot book past session.",
    }
  }

  // Temporarily disabled: consecutive session rule
  // if (session.previousDoctorSession) {
  //   const previousFull = await checkConsecutiveSessionFull(sessionId)
  //   if (!previousFull) {
  //     return {
  //       success: false,
  //       errorCode: "previousessionfill",
  //       message: "Previous Consecutive Sessions is not Full.",
  //     }
  //   }
  // }

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
    const ref = (input.agency_ref ?? "").toUpperCase()
    const refError = await verifyAgencyReference(ref, input.agency.id)
    if (refError) {
      return {
        success: false,
        errorCode: "agencyRefError",
        message: "Agency Reference Error.",
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

  const sessionDate = new Date(session.date)
  sessionDate.setUTCHours(0, 0, 0, 0)
  const sessionStartTime =
    Math.floor(sessionDate.getTime() / 1000) + session.startTime * 60
  const sessionEndTime =
    Math.floor(sessionDate.getTime() / 1000) + session.endTime * 60

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
