import type { Prisma, PrismaClient } from "@prisma/client"
import { getReceiptSequenceInfo } from "./get-receipt-sequence"
import { getNextSequenceNumber } from "./sequence"

/** Receipt params without sequence (helper resolves receiptNo/receiptNoString from locationId + method). */
export type CreateReceiptForBookingReceiptParams = {
  paymentMethod: number
  amount: number
  bank?: string
  bankId?: string | null
  cardReference?: string
  slipReference?: string
  remarks: string
  /** 0 CREDIT (refund), 1 DEBIT (payment) */
  type: number
  /** 0 REFUND, 1 PAYMENT, 4 DOCTOR PAYMENTS, 5 DOCTOR CANCELS */
  method: number
  bookingId: string
  agencyId?: string | null
  createdBy?: string | null
  locationId?: string | null
  userLocationId?: string | null
}

/** Minimal receipt shape returned from create; getBookingUpdate receives this. */
export type CreatedReceipt = Prisma.ReceiptGetPayload<object>

export type CreateReceiptAndUpdateBookingParams = CreateReceiptForBookingReceiptParams & {
  /** Location for receipt sequence scope (null = global). */
  locationId: string | null
  /** Receipt sequence method: 0 REFUND, 1 PAYMENT, etc. (passed to getReceiptSequenceInfo). */
  receiptSequenceMethod: number
  /** Build booking update data from the created receipt. Runs inside the same transaction. */
  getBookingUpdate: (receipt: CreatedReceipt) => Prisma.BookingUncheckedUpdateInput
}

export type CreateReceiptAndUpdateBookingResult =
  | { success: true; receipt: CreatedReceipt }
  | { success: false; errorCode: string; message: string }

/** Transaction client (receipt + booking). */
type Tx = Pick<PrismaClient, "receipt" | "booking">

/**
 * Get next receipt number, create receipt, and update booking in one transaction.
 * Sequence is acquired in its own transaction; receipt create + booking update run in the passed-in tx.
 */
export async function createReceiptAndUpdateBooking(
  tx: Tx,
  params: CreateReceiptAndUpdateBookingParams
): Promise<CreateReceiptAndUpdateBookingResult> {
  const { scopeKey, formatReceiptNoString } = await getReceiptSequenceInfo(
    params.locationId,
    params.receiptSequenceMethod
  )
  const seqResult = await getNextSequenceNumber(scopeKey, { startFrom: 1 })
  if (!seqResult.success) {
    return { success: false, errorCode: "server_error", message: "Failed to get receipt number." }
  }
  const receiptNo = seqResult.value
  const receiptNoString = formatReceiptNoString(receiptNo)

  const receipt = await tx.receipt.create({
    data: {
      receiptNo,
      receiptNoString,
      paymentMethod: params.paymentMethod,
      amount: params.amount,
      bank: params.bank ?? "",
      bankId: params.bankId ?? null,
      cardReference: params.cardReference ?? "",
      slipReference: params.slipReference ?? "",
      remarks: params.remarks,
      type: params.type,
      method: params.method,
      whd: 0,
      whdPercentage: 0,
      bookingId: params.bookingId,
      agencyId: params.agencyId ?? null,
      createdBy: params.createdBy ?? null,
      locationId: params.locationId ?? null,
      userLocationId: params.userLocationId ?? null,
    },
  })

  await tx.booking.update({
    where: { id: params.bookingId },
    data: params.getBookingUpdate(receipt),
  })

  return { success: true, receipt }
}
