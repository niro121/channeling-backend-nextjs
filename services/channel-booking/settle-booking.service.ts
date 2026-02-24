import prisma from "@/lib/prisma"
import {
  createReceiptAndUpdateBooking,
  getProcessedDiscount,
  getBookingForSaveBooking,
} from "./helpers"

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

  const result = await prisma.$transaction(async (tx) =>
    createReceiptAndUpdateBooking(tx, {
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
      userLocationId: input.user_location_id ?? null,
      getBookingUpdate: (receipt) => ({
        status: 1,
        discountDivision,
        hospitalFeeDiscount: discountDivision.hospital_fee_discount,
        professionsalFeeDiscount: discountDivision.professionsal_fee_discount,
        discount,
        autoDiscountId: input.auto_discount_type ?? null,
        receiptNo: receipt.receiptNo,
        receiptNoString: receipt.receiptNoString,
        receiptPaymentMethod: input.settle_method,
        receiptNoCreatedAt: receipt.createdAt,
        receiptNoId: receipt.id,
        updatedBy: userId,
      }),
    })
  )

  if (!result.success) {
    return { success: false, errorCode: result.errorCode, message: result.message }
  }

  const fullBooking = await getBookingForSaveBooking(input.booking_id)
  return { success: true, data: fullBooking }
}
