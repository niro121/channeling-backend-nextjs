import prisma from "@/lib/prisma"
import { getNextSequenceNumber } from "./helpers"
import { getBookingForSaveBooking } from "./helpers"

/** refund_type: 0 = Cancel (full or no refund), 1 = Refund (partial) */
export type RefundChannelInput = {
  booking_id: string
  refund_type: number
  professional_fee: number
  hospital_fee: number
  /** 0 Cash, 1 Card, 4 Agent */
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

  const refundTo = input.refund_to ?? REFUND_TO_DEFAULT
  let remarks = (input.remarks ?? "STANDARD REFUND").trim()
  const paidReceipt = booking.receipts?.[0]
  if (paidReceipt) {
    remarks = `${remarks} - Ref Bill No. : ${paidReceipt.receiptNoString}`
  }

  // Cancel (refund_type 0)
  if (input.refund_type === 0) {
    if (booking.status === 1) {
      // Full refund: create refund receipt, set status 2
      const refundAmount = booking.amount - booking.discount
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
          paymentMethod: refundTo,
          amount: -1 * refundAmount,
          bank: refundTo === 1 && paidReceipt ? paidReceipt.bank : "",
          bankId: refundTo === 1 && paidReceipt ? paidReceipt.bankId : null,
          cardReference: refundTo === 1 && paidReceipt ? paidReceipt.cardReference : "",
          slipReference: "",
          remarks,
          type: 0,
          method: 0,
          whd: 0,
          whdPercentage: 0,
          bookingId: booking.id,
          agencyId: booking.agencyId ?? null,
          createdBy: userId,
          locationId: booking.locationId ?? null,
          userLocationId: null,
        },
      })

      await prisma.booking.update({
        where: { id: input.booking_id },
        data: {
          status: 2,
          refund: 3,
          refundAmount: newReceipt.amount,
        },
      })
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
    // Partial refund
    const totalRefund = input.professional_fee + input.hospital_fee
    if (totalRefund <= 0) {
      return { success: false, errorCode: "invalid_input", message: "Select at least one refundable amount." }
    }

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
        paymentMethod: refundTo,
        amount: -1 * totalRefund,
        bank: refundTo === 1 && paidReceipt ? paidReceipt.bank : "",
        bankId: refundTo === 1 && paidReceipt ? paidReceipt.bankId : null,
        cardReference: refundTo === 1 && paidReceipt ? paidReceipt.cardReference : "",
        slipReference: "",
        remarks,
        type: 0,
        method: 0,
        whd: 0,
        whdPercentage: 0,
        bookingId: booking.id,
        agencyId: booking.agencyId ?? null,
        createdBy: userId,
        locationId: booking.locationId ?? null,
        userLocationId: null,
      },
    })

    let refundType = 0
    if (input.hospital_fee > 0 && input.professional_fee > 0) refundType = 3
    else if (input.hospital_fee > 0) refundType = 2
    else if (input.professional_fee > 0) refundType = 1

    await prisma.booking.update({
      where: { id: input.booking_id },
      data: {
        refund: refundType,
        refundAmount: newReceipt.amount,
      },
    })
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
