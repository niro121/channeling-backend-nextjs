import prisma from "@/lib/prisma"
import { formatLKR } from "@/lib/format-money"
import {
  buildPlaceholdersForBookingReceipt,
  type BookingReceiptPrintInput,
} from "@/lib/receipt-template/build-placeholders"
import { getActiveReceiptTemplate } from "@/services/receipt-template/receipt-template.service"
import { getBookingDetailsService } from "./get-booking-details.service"
import { resolveUser } from "./helpers/resolve-user"
import type { ReceiptPlaceholderMap } from "@/types/receipt-template-db"
import type { ReceiptTemplateRecord } from "@/types/receipt-template-db"

function formatAppointmentNo(value: string | number): string {
  const s = String(value).trim()
  const n = parseInt(s, 10)
  if (Number.isNaN(n) || s === "") return s
  return String(n).padStart(2, "0")
}

function money(amount: number): string {
  return `Rs. ${formatLKR(amount)}`
}

export type PrintBookingReceiptData = {
  placeholders: ReceiptPlaceholderMap
  template: ReceiptTemplateRecord | null
  receiptNoString: string
  isDuplicate: boolean
}

export async function printBookingReceiptService(
  receiptId: string,
  printedByUserId?: string | null
): Promise<{ success: boolean; data?: PrintBookingReceiptData; message?: string }> {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      select: {
        id: true,
        bookingId: true,
        receiptNoString: true,
        printCount: true,
        printedAt: true,
        locationId: true,
        booking: {
          select: {
            location: { select: { name: true } },
          },
        },
      },
    })
    if (!receipt) {
      return { success: false, message: "Receipt not found." }
    }
    if (!receipt.bookingId) {
      return { success: false, message: "This receipt is not linked to a booking." }
    }

    const bookingRes = await getBookingDetailsService(receipt.bookingId)
    if (!bookingRes.success || !bookingRes.data) {
      return { success: false, message: bookingRes.message ?? "Failed to load booking." }
    }
    const details = bookingRes.data

    const previousCount = Number(receipt.printCount ?? 0)
    const isDuplicate = previousCount >= 1
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        printCount: { increment: 1 },
        ...(previousCount === 0 && !receipt.printedAt ? { printedAt: new Date() } : {}),
      },
    })

    const refund = details.cancelOrRefundDetails
    const refundAmount = refund && refund.refundAmount !== 0 ? money(Math.abs(refund.refundAmount)) : ""
    const refundReceiptNo = refund?.refundReceipts[0]?.receiptNoString?.trim() ?? ""
    const refundReason = refund?.refundReason?.trim() ?? ""
    const refundParts: string[] = []
    if (refundAmount) refundParts.push(`Refund Amount: ${refundAmount}`)
    if (refundReceiptNo) refundParts.push(`Refund Receipt: ${refundReceiptNo}`)
    if (refundReason) refundParts.push(`Cancel / refund remark: ${refundReason}`)

    const locationId = receipt.locationId
    const location = locationId
      ? await prisma.location.findUnique({
          where: { id: locationId },
          select: { name: true },
        })
      : null
    const locationName = location?.name ?? receipt.booking?.location?.name

    const generatedByName = printedByUserId ? await resolveUser(printedByUserId) : ""
    const generatedBy =
      printedByUserId && generatedByName && generatedByName !== "—"
        ? `${generatedByName} (${printedByUserId})`
        : generatedByName || ""

    const input: BookingReceiptPrintInput = {
      patientName: details.name,
      consultant: details.consultant,
      appointmentNo: formatAppointmentNo(details.appointmentNo),
      appointmentDate: details.appointmentDate,
      appointmentTime: details.appointmentTime,
      tel: details.phone,
      bookingMethod: details.bookingMethod,
      billNo: details.billNo,
      billSubTotal: money(details.billSubTotal),
      discount: money(details.discount),
      billTotal: money(details.billTotal),
      billedBy: details.billedBy,
      remarks: details.remark?.trim() || "—",
      area: details.area,
      refundLine: refundParts.join("\n"),
      refundAmount,
      refundReceiptNo,
      refundReason,
      generatedBy,
      companyName: locationName,
      locationName,
      duplicateLabel: isDuplicate ? "DUPLICATE" : "",
    }

    const placeholders = buildPlaceholdersForBookingReceipt(input)
    const templateRes = await getActiveReceiptTemplate("booking_receipt", "custom_size")
    const template =
      templateRes.success && templateRes.data != null ? templateRes.data : null

    return {
      success: true,
      data: {
        placeholders,
        template,
        receiptNoString: receipt.receiptNoString,
        isDuplicate,
      },
    }
  } catch (error) {
    console.error("printBookingReceiptService error", error)
    const message = error instanceof Error ? error.message : "Failed to prepare receipt for print"
    return { success: false, message }
  }
}
