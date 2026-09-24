import { format } from "date-fns"
import prisma from "@/lib/prisma"
import { formatLKR } from "@/lib/format-money"
import {
  buildPlaceholdersForBookingReceipt,
  type BookingReceiptPrintInput,
} from "@/lib/receipt-template/build-placeholders"
import {
  formatLocationAddress,
  PROFESSIONAL_BILL_EXCLUDED_DOCTOR_CODES,
  RUHUNU_HOSPITAL,
} from "@/lib/receipt-template/ruhunu-hospital"
import { getActiveReceiptTemplate } from "@/services/receipt-template/receipt-template.service"
import { getBookingDetailsService } from "./get-booking-details.service"
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

function invoiceStatus(status: number): string {
  if (status === 0) return "Credit"
  if (status === 1) return "Paid"
  if (status === 2) return "Canceled"
  return "Unknown"
}

function statusBanner(opts: { status: number; refund: number; isDuplicate: boolean }): string {
  if (opts.refund !== 0 && opts.status === 1) return "**Refunded**"
  if (opts.status === 2) return "**Canceled**"
  if (opts.isDuplicate && opts.refund === 0 && opts.status === 1) return "**Duplicate**"
  return ""
}

/** Cashier Code / Printed by: staff code only (no display name). */
async function resolveUserPrintCode(userId: string | null | undefined): Promise<string> {
  if (!userId) return ""
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { staff: { select: { code: true } } },
  })
  return user?.staff?.code?.trim() || ""
}

/**
 * Normal prints: booking.createdBy → staff code (unchanged).
 * Refund prints: prefer payment-receipt cashier, then booking staff code, then booking creator.
 */
async function resolveCashierCodeForPrint(opts: {
  bookingId: string
  bookingCreatedBy: string | null | undefined
  bookingStaffCode: string | null | undefined
  receiptMethod: number
  receiptCreatedBy: string | null | undefined
  isRefunded: boolean
}): Promise<string> {
  const isRefundReceipt = opts.receiptMethod === 0
  if (!opts.isRefunded && !isRefundReceipt) {
    return resolveUserPrintCode(opts.bookingCreatedBy)
  }

  let paymentCreatedBy =
    opts.receiptMethod === 1 ? opts.receiptCreatedBy : null
  if (!paymentCreatedBy) {
    const payment = await prisma.receipt.findFirst({
      where: { bookingId: opts.bookingId, method: 1 },
      orderBy: { createdAt: "asc" },
      select: { createdBy: true },
    })
    paymentCreatedBy = payment?.createdBy ?? null
  }

  const fromPayment = await resolveUserPrintCode(paymentCreatedBy)
  if (fromPayment) return fromPayment

  const staffCode = opts.bookingStaffCode?.trim()
  if (staffCode) return staffCode

  const fromBookingCreator = await resolveUserPrintCode(opts.bookingCreatedBy)
  if (fromBookingCreator) return fromBookingCreator

  return resolveUserPrintCode(opts.receiptCreatedBy)
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
        method: true,
        createdBy: true,
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

    const extra = await prisma.booking.findUnique({
      where: { id: receipt.bookingId },
      select: {
        createdBy: true,
        hospitalFee: true,
        professionalFee: true,
        hospitalFeeDiscount: true,
        professionsalFeeDiscount: true,
        doctor: { select: { code: true } },
        staff: { select: { name: true, code: true } },
        agency: { select: { name: true, code: true } },
        location: {
          select: { name: true, addressLine1: true, addressLine2: true, city: true },
        },
      },
    })

    const locationFromReceipt = receipt.locationId
      ? await prisma.location.findUnique({
          where: { id: receipt.locationId },
          select: { name: true, addressLine1: true, addressLine2: true, city: true },
        })
      : null
    const location = locationFromReceipt ?? extra?.location ?? null

    const locationName = location?.name?.trim() || RUHUNU_HOSPITAL.name
    const locationAddress = location ? formatLocationAddress(location) : ""
    const addressLine = locationAddress || RUHUNU_HOSPITAL.address

    const hospitalFee = extra?.hospitalFee ?? details.refundableBreakdown?.hospitalFee ?? 0
    const hospitalFeeDiscount =
      extra?.hospitalFeeDiscount ?? details.discountInfo.hospitalFeeDiscount ?? 0
    const professionalFee =
      extra?.professionalFee ?? details.refundableBreakdown?.professionalFee ?? 0
    const professionalFeeDiscount =
      extra?.professionsalFeeDiscount ?? details.discountInfo.professionalFeeDiscount ?? 0

    const doctorCode = extra?.doctor?.code ?? ""
    const showProfessionalBill =
      professionalFee > 0 &&
      !(PROFESSIONAL_BILL_EXCLUDED_DOCTOR_CODES as readonly string[]).includes(doctorCode)

    const staffDebiter = extra?.staff
      ? `${extra.staff.name}${extra.staff.code ? ` (${extra.staff.code})` : ""}`
      : ""
    const agencyDebiter = extra?.agency
      ? `${extra.agency.name}${extra.agency.code ? ` (${extra.agency.code})` : ""}`
      : ""
    const creditDebiter = details.creditCustomerInfo
      ? `${details.creditCustomerInfo.creditCustomerName}${
          details.creditCustomerInfo.creditCustomerCode
            ? ` (${details.creditCustomerInfo.creditCustomerCode})`
            : ""
        }`
      : ""
    const debiter = [staffDebiter, agencyDebiter, creditDebiter].filter(Boolean).join(" ")

    const refund = details.cancelOrRefundDetails
    const refundAmount = refund && refund.refundAmount !== 0 ? money(Math.abs(refund.refundAmount)) : ""
    const refundReceiptNo = refund?.refundReceipts[0]?.receiptNoString?.trim() ?? ""
    const refundReason = refund?.refundReason?.trim() ?? ""
    const approvals = refund?.approvals ?? []
    const approvedBy =
      approvals.length <= 1
        ? (approvals[0]?.value ?? "")
        : approvals
            .map((approval) => {
              const kind = approval.label.startsWith("Cancel") ? "Cancel" : "Refund"
              return `${kind}: ${approval.value}`
            })
            .join("; ")
    const refundParts: string[] = []
    if (refundAmount) refundParts.push(`Refund Amount: ${refundAmount}`)
    if (refundReceiptNo) refundParts.push(`Refund Receipt: ${refundReceiptNo}`)
    if (refundReason) refundParts.push(`Cancel / refund remark: ${refundReason}`)
    if (approvedBy) refundParts.push(approvedBy)

    const [cashierCode, printedBy] = await Promise.all([
      resolveCashierCodeForPrint({
        bookingId: receipt.bookingId,
        bookingCreatedBy: extra?.createdBy,
        bookingStaffCode: extra?.staff?.code,
        receiptMethod: receipt.method,
        receiptCreatedBy: receipt.createdBy,
        isRefunded: (details.refund ?? 0) !== 0,
      }),
      resolveUserPrintCode(printedByUserId),
    ])

    const billedAt = format(new Date(details.createdAt), "yyyy-MM-dd, h:mm:ss a")
    const banner = statusBanner({
      status: details.status,
      refund: details.refund ?? 0,
      isDuplicate,
    })

    const input: BookingReceiptPrintInput = {
      patientName: details.name.toUpperCase(),
      consultant: details.consultant.toUpperCase(),
      appointmentNo: formatAppointmentNo(details.appointmentNo),
      appointmentDate: details.appointmentDate,
      appointmentTime: details.appointmentTime,
      tel: details.phone,
      bookingMethod: details.bookingMethod,
      billNo: details.billNo,
      billSubTotal: money(details.billSubTotal),
      discount: money(details.discount),
      billTotal: money(details.billTotal),
      hospitalFee: money(hospitalFee),
      hospitalFeeDiscount: hospitalFeeDiscount > 0 ? money(hospitalFeeDiscount) : "",
      totalHospitalFee: money(Math.max(0, hospitalFee - hospitalFeeDiscount)),
      professionalFee: money(professionalFee),
      professionalFeeDiscount: professionalFeeDiscount > 0 ? money(professionalFeeDiscount) : "",
      totalProfessionalFee: money(Math.max(0, professionalFee - professionalFeeDiscount)),
      billedAt,
      cashierCode,
      invoiceStatus: invoiceStatus(details.status),
      printedBy,
      debiter,
      showProfessionalBill,
      billedBy: details.billedBy,
      remarks: details.remark?.trim() || "—",
      area: details.area,
      refundLine: refundParts.join("\n"),
      refundAmount,
      refundReceiptNo,
      refundReason,
      approvedBy,
      generatedBy: printedBy,
      companyName: locationName,
      locationName,
      locationAddress: addressLine,
      duplicateLabel: isDuplicate ? "DUPLICATE" : "",
      statusBanner: banner,
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
