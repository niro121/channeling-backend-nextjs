import prisma from "@/lib/prisma"
import {
  getProcessedDiscount,
  getBookingForSaveBooking,
  getNextSequenceNumber,
} from "./helpers"
import type { Session } from "@/types/booking.dashboard"

export type SettleBookingInput = {
  booking_id: string
  settle_method: number // 0=Cash, 1=Credit Card, 2=Slip, 3=Cheque
  discount: number
  auto_discount_type?: string
  bank?: { id: string; name?: string } | null
  slip_ref?: string
  card?: string
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

  let discount = input.discount
  const discountDivision = {
    hospital_fee_discount: booking.hospitalFeeDiscount ?? 0,
    professionsal_fee_discount: booking.professionsalFeeDiscount ?? 0,
    other_discount: 0,
  } as { hospital_fee_discount: number; professionsal_fee_discount: number; other_discount: number }

  if (input.auto_discount_type && booking.session) {
    const sessionForDiscount: Session = {
      id: booking.session.id,
      date: booking.session.date,
      startTime: booking.session.startTime,
      endTime: booking.session.endTime,
      fees: booking.session.fees as Session["fees"],
      amountLocal: booking.session.amountLocal ?? null,
      amountForeign: booking.session.amountForeign ?? null,
      status: booking.session.status,
      appointmentNo: booking.session.appointmentNo,
      isScan: booking.session.isScan,
      doctorId: booking.session.doctorId ?? null,
      departmentId: booking.session.departmentId ?? null,
      locationId: booking.session.locationId ?? null,
      roomId: booking.session.roomId ?? null,
      location: booking.session.location ?? null,
      room: booking.session.room ?? null,
      doctor: booking.session.doctor ?? null,
      institution: booking.session.institution,
      doctorSessionId: booking.session.doctorSessionId,
      previousDoctorSession: booking.session.previousDoctorSession,
      durationMinutes: booking.session.durationMinutes,
      startingPatientNumber: booking.session.startingPatientNumber,
      maxPatientNumber: booking.session.maxPatientNumber,
      refundable: booking.session.refundable,
      remarks: booking.session.remarks ?? null,
      createdAt: booking.session.createdAt,
      updatedAt: booking.session.updatedAt,
    }
    const result = await getProcessedDiscount(
      input.auto_discount_type,
      booking.method,
      input.settle_method,
      sessionForDiscount,
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
  const scopeKey = `receipt:${booking.locationId ?? "global"}`
  const seqResult = await getNextSequenceNumber(scopeKey)
  if (!seqResult.success) {
    return { success: false, errorCode: "server_error", message: "Failed to get receipt number." }
  }
  const receiptNo = seqResult.value
  const receiptNoString = `REC-${String(receiptNo).padStart(8, "0")}`

  const newReceipt = await prisma.receipt.create({
    data: {
      receiptNo,
      receiptNoString,
      paymentMethod: input.settle_method,
      amount,
      bank: input.bank?.name ?? "",
      bankId: input.bank?.id ?? null,
      cardReference: input.card ?? "",
      slipReference: input.slip_ref ?? "",
      remarks: "POS PAYMENT",
      type: 1,
      method: 1, // PAYMENT RECEIPTS
      whd: 0,
      whdPercentage: 0,
      bookingId: booking.id,
      agencyId: booking.agencyId ?? null,
      createdBy: userId,
      locationId: booking.locationId ?? null,
      userLocationId: input.user_location_id ?? null,
    },
  })

  await prisma.booking.update({
    where: { id: input.booking_id },
    data: {
      status: 1,
      discountDivision,
      hospitalFeeDiscount: discountDivision.hospital_fee_discount,
      professionsalFeeDiscount: discountDivision.professionsal_fee_discount,
      discount,
      autoDiscountId: input.auto_discount_type ?? null,
      receiptNo: newReceipt.receiptNo,
      receiptNoString: newReceipt.receiptNoString,
      receiptPaymentMethod: input.settle_method,
      receiptNoCreatedAt: newReceipt.createdAt,
      receiptNoId: newReceipt.id,
      updatedBy: userId,
    },
  })

  const fullBooking = await getBookingForSaveBooking(input.booking_id)
  return { success: true, data: fullBooking }
}
