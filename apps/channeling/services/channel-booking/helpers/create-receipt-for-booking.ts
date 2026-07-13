import type { Prisma, PrismaClient } from "@prisma/client"
import { getReceiptSequenceInfo } from "./get-receipt-sequence"
import { getNextSequenceNumber } from "./sequence"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"

export type ReceiptPaymentLineDraft = {
  paymentMethod: number
  amount: number
  bank?: string
  bankId?: string | null
  cardReference?: string
  slipReference?: string
  slipDate?: Date | null
}

/** Receipt params without sequence (helper resolves receiptNo/receiptNoString from locationId + method). */
export type CreateReceiptForBookingReceiptParams = {
  paymentMethod: number
  amount: number
  bank?: string
  bankId?: string | null
  cardReference?: string
  slipReference?: string
  slipDate?: Date | null
  remarks: string
  /** 0 CREDIT (refund), 1 DEBIT (payment) */
  type: number
  /** 0 REFUND, 1 PAYMENT, 4 DOCTOR PAYMENTS, 5 DOCTOR CANCELS */
  method: number
  bookingId: string
  agencyId?: string | null
  creditCustomerId?: string | null
  createdBy?: string | null
  /** Channel booking shift id when receipt is created during a shift (for reconciliation). */
  shiftId?: string | null
  locationId?: string | null
  userLocationId?: string | null
  paymentLines?: ReceiptPaymentLineDraft[]
}

/** Minimal receipt shape returned from create; getBookingUpdate receives this. */
export type CreatedReceipt = Prisma.ReceiptGetPayload<{
  include: { paymentLines: true }
}>

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

function toCents(value: number): number {
  return Math.round(Number(value || 0) * 100)
}

/** Params for creating a ledger receipt (no booking). */
export type CreateReceiptWithoutBookingParams = {
  paymentMethod: number
  amount: number
  bank?: string
  bankId?: string | null
  cardReference?: string
  slipReference?: string
  slipDate?: Date | null
  remarks: string
  /** 0 CREDIT, 1 DEBIT */
  type: number
  /** 2 DEBIT_NOTE, 3 CREDIT_NOTE, 4 DOCTOR_PAYMENT, 5 DOCTOR_CANCEL, 6 AGENCY_DEPOSIT, 7 AGENCY_WITHDRAW, 8 BRANCH_INCOME, 9 BRANCH_EXPENSE */
  method: number
  agencyId?: string | null
  createdBy?: string | null
  /** Branch/location for the transaction; used as locationId for branch types, userLocationId for agency ledger. */
  locationId: string | null
  /** For agency ledger methods (2,3,6,7), same as branch; passed to getReceiptSequenceInfo as userLocationId. */
  userLocationId?: string | null
  /** For method 4 (doctor payment): WHT amount in rupees. */
  whd?: number
  /** For method 4 (doctor payment): WHT percentage. */
  whdPercentage?: number
  /** Channel booking shift id when receipt is created during a shift (for reconciliation). */
  shiftId?: string | null
  paymentLines?: ReceiptPaymentLineDraft[]
}

export type CreateReceiptWithoutBookingResult =
  | { success: true; receipt: CreatedReceipt }
  | { success: false; errorCode: string; message: string }

function normalizeReceiptPaymentLines(
  paymentMethod: number,
  amount: number,
  bank?: string,
  bankId?: string | null,
  cardReference?: string,
  slipReference?: string,
  slipDate?: Date | null,
  paymentLines?: ReceiptPaymentLineDraft[]
): { lines: ReceiptPaymentLineDraft[]; headerPaymentMethod: number } | { error: string } {
  const normalizedInput = (paymentLines ?? []).filter((line) => Number(line.amount) !== 0)
  const lines =
    normalizedInput.length > 0
      ? normalizedInput
      : [
          {
            paymentMethod,
            amount,
            bank,
            bankId,
            cardReference,
            slipReference,
            slipDate: slipDate ?? null,
          },
        ]
  const total = lines.reduce((sum, line) => sum + Number(line.amount ?? 0), 0)
  if (toCents(total) !== toCents(amount)) {
    return { error: `Receipt payment line total (${total}) must match receipt amount (${amount}).` }
  }
  const headerPaymentMethod =
    lines.length > 1 ? RECEIPT_PAYMENT_METHOD.MIXED : lines[0].paymentMethod
  return { lines, headerPaymentMethod }
}

/**
 * Create a receipt without a booking (ledger transactions). Sequence is acquired then receipt created in tx.
 */
export async function createReceiptWithoutBooking(
  tx: Pick<PrismaClient, "receipt">,
  params: CreateReceiptWithoutBookingParams
): Promise<CreateReceiptWithoutBookingResult> {
  const normalized = normalizeReceiptPaymentLines(
    params.paymentMethod,
    params.amount,
    params.bank,
    params.bankId ?? null,
    params.cardReference,
    params.slipReference,
    params.slipDate ?? null,
    params.paymentLines
  )
  if ("error" in normalized) {
    return { success: false, errorCode: "invalid_payment_lines", message: normalized.error }
  }
  const { scopeKey, formatReceiptNoString } = await getReceiptSequenceInfo(
    params.locationId,
    params.method,
    params.userLocationId
  )
  const seqResult = await getNextSequenceNumber(scopeKey, { startFrom: 1 })
  if (!seqResult.success) {
    return { success: false, errorCode: "server_error", message: "Failed to get receipt number." }
  }
  const receiptNo = seqResult.value
  const receiptNoString = formatReceiptNoString(receiptNo)

  const headerSlipDate =
    params.slipDate ??
    normalized.lines.find((l) => l.slipDate)?.slipDate ??
    null

  const receipt = await tx.receipt.create({
    data: {
      receiptNo,
      receiptNoString,
      paymentMethod: normalized.headerPaymentMethod,
      amount: params.amount,
      bank: params.bank ?? "",
      bankId: params.bankId ?? null,
      cardReference: params.cardReference ?? "",
      slipReference: params.slipReference ?? "",
      slipDate: headerSlipDate,
      remarks: params.remarks,
      type: params.type,
      method: params.method,
      whd: params.whd ?? 0,
      whdPercentage: params.whdPercentage ?? 0,
      bookingId: null,
      agencyId: params.agencyId ?? null,
      createdBy: params.createdBy ?? null,
      shiftId: params.shiftId ?? null,
      locationId: params.locationId ?? null,
      userLocationId: params.userLocationId ?? params.locationId ?? null,
      paymentLines: {
        create: normalized.lines.map((line) => ({
          paymentMethod: line.paymentMethod,
          amount: line.amount,
          bank: line.bank ?? "",
          bankId: line.bankId ?? null,
          cardReference: line.cardReference ?? "",
          slipReference: line.slipReference ?? "",
          slipDate: line.slipDate ?? null,
        })),
      },
    },
    include: { paymentLines: true },
  })

  return { success: true, receipt }
}

/**
 * Get next receipt number, create receipt, and update booking in one transaction.
 * Sequence is acquired in its own transaction; receipt create + booking update run in the passed-in tx.
 */
export async function createReceiptAndUpdateBooking(
  tx: Tx,
  params: CreateReceiptAndUpdateBookingParams
): Promise<CreateReceiptAndUpdateBookingResult> {
  const normalized = normalizeReceiptPaymentLines(
    params.paymentMethod,
    params.amount,
    params.bank,
    params.bankId ?? null,
    params.cardReference,
    params.slipReference,
    params.slipDate ?? null,
    params.paymentLines
  )
  if ("error" in normalized) {
    return { success: false, errorCode: "invalid_payment_lines", message: normalized.error }
  }
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

  const headerSlipDate =
    params.slipDate ??
    normalized.lines.find((l) => l.slipDate)?.slipDate ??
    null

  const receipt = await tx.receipt.create({
    data: {
      receiptNo,
      receiptNoString,
      paymentMethod: normalized.headerPaymentMethod,
      amount: params.amount,
      bank: params.bank ?? "",
      bankId: params.bankId ?? null,
      cardReference: params.cardReference ?? "",
      slipReference: params.slipReference ?? "",
      slipDate: headerSlipDate,
      remarks: params.remarks,
      type: params.type,
      method: params.method,
      whd: 0,
      whdPercentage: 0,
      bookingId: params.bookingId,
      agencyId: params.agencyId ?? null,
      creditCustomerId: params.creditCustomerId ?? null,
      createdBy: params.createdBy ?? null,
      shiftId: params.shiftId ?? null,
      locationId: params.locationId ?? null,
      userLocationId: params.userLocationId ?? null,
      paymentLines: {
        create: normalized.lines.map((line) => ({
          paymentMethod: line.paymentMethod,
          amount: line.amount,
          bank: line.bank ?? "",
          bankId: line.bankId ?? null,
          cardReference: line.cardReference ?? "",
          slipReference: line.slipReference ?? "",
          slipDate: line.slipDate ?? null,
        })),
      },
    },
    include: { paymentLines: true },
  })

  await tx.booking.update({
    where: { id: params.bookingId },
    data: params.getBookingUpdate(receipt),
  })

  return { success: true, receipt }
}
