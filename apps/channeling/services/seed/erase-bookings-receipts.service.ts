/**
 * Erase all bookings and receipts, then reset session appointment numbers and
 * booking/receipt-related sequence counters. Used by admin seed page and optionally by CLI.
 * Runs only when SEED_HELPER is enabled in .env.
 */

import prisma from "@/lib/prisma"
import { isSeedHelperEnabled, SEED_HELPER_DISABLED_MESSAGE } from "./seed-helper-enabled"

const BOOKING_RECEIPT_SCOPE_SUFFIXES = [
  "bookings",
  "paymentreceipts",
  "refundreceipts",
  "doctorpaymentreceipts",
  "doctorpaymentcancelreceipts",
  "legerdebits",
  "legercredits",
  "legerdeposit",
  "legerwithdraw",
  "branchincome",
  "branchexpense",
]

function isBookingOrReceiptScope(scopeKey: string): boolean {
  if (scopeKey === "booking:global" || scopeKey === "receipt:global") return true
  return BOOKING_RECEIPT_SCOPE_SUFFIXES.some((s) => scopeKey.endsWith(`-${s}`))
}

export type EraseBookingsReceiptsResult =
  | { success: true; message: string; details: string }
  | { success: false; message: string }

export async function runEraseBookingsReceipts(): Promise<EraseBookingsReceiptsResult> {
  if (!isSeedHelperEnabled()) {
    return { success: false, message: SEED_HELPER_DISABLED_MESSAGE }
  }
  try {
    const lines: string[] = []

    const deletedReceipts = await prisma.receipt.deleteMany({})
    lines.push(`Deleted ${deletedReceipts.count} receipt(s).`)

    const deletedBookings = await prisma.booking.deleteMany({})
    lines.push(`Deleted ${deletedBookings.count} booking(s).`)

    const sessionsUpdated = await prisma.session.updateMany({
      data: { appointmentNo: 0 },
    })
    lines.push(`Reset appointmentNo to 0 for ${sessionsUpdated.count} session(s).`)

    const allSequences = await prisma.sequence.findMany({
      select: { id: true, scopeKey: true },
    })
    const toDelete = allSequences.filter((s) => isBookingOrReceiptScope(s.scopeKey))
    if (toDelete.length > 0) {
      await prisma.sequence.deleteMany({
        where: { id: { in: toDelete.map((s) => s.id) } },
      })
      lines.push(`Deleted ${toDelete.length} sequence(s): ${toDelete.map((s) => s.scopeKey).join(", ")}.`)
    } else {
      lines.push("No booking/receipt sequence rows to delete.")
    }

    return {
      success: true,
      message: "Bookings, receipts, session appointment numbers, and related sequences have been erased.",
      details: lines.join("\n"),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Erase failed: ${message}` }
  }
}
