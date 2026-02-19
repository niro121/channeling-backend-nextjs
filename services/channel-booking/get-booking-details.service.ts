import prisma from "@/lib/prisma"
import { normalizeSessionTime } from "@/lib/utils"
import { BOOKING_METHODS } from "@/types/channel-booking"
import { resolveUser } from "./helpers/resolve-user"

const PAYMENT_METHOD_NAMES: Record<number, string> = {
  0: "Cash",
  1: "Credit Card",
  2: "Slip",
  3: "Cheque",
  4: "Agent",
  5: "Credit",
}

/** Receipt method: 0 REFUND, 1 PAYMENT, 2 DEBIT NOTES, 3 CREDIT NOTES, 4 DOCTOR PAYMENTS, 5 DOCTOR CANCELS */
const RECEIPT_METHOD_NAMES: Record<number, string> = {
  0: "Refund",
  1: "Settlement",
  2: "Debit Note",
  3: "Credit Note",
  4: "Doctor Payment",
  5: "Doctor Cancel",
}

/** One row for the receipts table on the Booking tab. */
export type ReceiptRowView = {
  id: string
  receiptNoString: string
  type: string
  paymentMethodName: string
  amount: number
  remarks: string
  processedBy: string
  createdAt: Date
}

/** When booking is canceled (status === 2): refund amount and refund receipts for display. */
export type CancelOrRefundDetailsView = {
  refundAmount: number
  refundReceipts: ReceiptRowView[]
}

/** Settlement/receipt info when booking is paid (status !== 0). */
export type SettlementDetailsView = {
  receiptNo: number
  receiptNoString: string
  paymentMethod: number
  paymentMethodName: string
  amount: number
  settledAt: Date
  bank: string
  cardReference: string
  slipReference: string
}

/** Discount-related info for the Booking tab. */
export type DiscountInfoView = {
  /** Total discount amount. */
  total: number
  /** Manual discount scheme name (if discountId was used). */
  manualSchemeName: string | null
  /** Auto discount scheme name (if autoDiscountId was used). */
  autoSchemeName: string | null
  /** Hospital fee discount amount. */
  hospitalFeeDiscount: number
  /** Professional fee discount amount. */
  professionalFeeDiscount: number
  /** Other discount amount (if any). */
  otherDiscount: number
}

/** Agent-related info for the Booking tab (when booking method is Agent). */
export type AgentInfoView = {
  agencyName: string
  agencyCode: string | null
  agencyRef: string
  /** Book number (prefix of agencyRef, e.g. C0333). */
  bookNumber: string | null
}

/** Display shape for the Information panel Booking tab. */
export type BookingDetailsView = {
  id: string
  /** Display name (title + name). */
  name: string
  /** Raw title for Change tab (e.g. MRS.). */
  patientTitle: string
  /** Raw name for Change tab (e.g. SURENI JAYASEKARA). */
  patientName: string
  /** Sex for Change tab (e.g. Male, Female). */
  patientSex: string
  consultant: string
  appointmentNo: number
  appointmentDate: string
  appointmentTime: string
  phone: string
  bookingMethod: string
  agentRef: string
  referredBy: string
  billNo: string
  billSubTotal: number
  discount: number
  billTotal: number
  billedBy: string
  remark: string
  area: string
  foreigner: boolean
  status: number
  createdAt: Date
  /** Discount breakdown and scheme names for display. */
  discountInfo: DiscountInfoView
  /** When booking method is Agent: agency and financial details. */
  agentInfo: AgentInfoView | null
  /** Present when status !== 0 (paid). */
  settlement?: SettlementDetailsView
  /** All receipts attached to this booking (for table). */
  receipts: ReceiptRowView[]
  /** For Refund tab when status === 1: fee breakdown and refundable amounts. */
  refundableBreakdown?: {
    professionalFee: number
    professionalDiscount: number
    refundableProfessional: number
    hospitalFee: number
    hospitalDiscount: number
    refundableHospital: number
  }
  /** When status === 2 (canceled): refund amount and refund receipts for Cancel/Refund tab. */
  cancelOrRefundDetails?: CancelOrRefundDetailsView
}

function formatAppointmentDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatAppointmentTime(startTime: Date | number): string {
  const d = startTime instanceof Date ? startTime : new Date(startTime)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? "AM" : "PM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

/**
 * Load one booking by id with session and doctor for the Information panel Booking tab.
 */
export async function getBookingDetailsService(
  bookingId: string
): Promise<{ success: boolean; data?: BookingDetailsView; message?: string }> {
  try {
    const b = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: true,
        doctor: true,
        receipts: { orderBy: { createdAt: "desc" } },
        agency: true,
      },
    })
    if (!b) {
      return { success: false, message: "Booking not found" }
    }
    if (!b.session) {
      return { success: false, message: "Booking has no session" }
    }
    const createdByName = await resolveUser(b.createdBy)
    const methodName = BOOKING_METHODS.find((m) => m.id === b.method)?.name ?? ""
    const sessionDate = b.session.date instanceof Date ? b.session.date : new Date(b.session.date)
    const startTime = normalizeSessionTime(b.session.startTime as Date | number, sessionDate)
    const appointmentTime = formatAppointmentTime(startTime)
    const consultant = `${b.doctor.title} ${b.doctor.name}`.trim()
    const billedById = b.createdBy ?? ""
    const billedByStr = `${createdByName}${billedById ? ` (${billedById})` : ""} - ${b.createdAt.toLocaleString("en-CA", { dateStyle: "short", timeStyle: "medium" })}`
    const billSubTotal = b.amount + b.discount
    const receipt = b.receipts?.[0] ?? null
    const receiptRows: ReceiptRowView[] = await Promise.all(
      (b.receipts ?? []).map(async (r) => {
        const createdByName = await resolveUser(r.createdBy)
        const createdByStr = r.createdBy
          ? `${createdByName} (${r.createdBy}) ${r.createdAt.toLocaleString("en-CA", { dateStyle: "short", timeStyle: "short" })}`
          : "—"
        return {
          id: r.id,
          receiptNoString: r.receiptNoString,
          type: RECEIPT_METHOD_NAMES[r.method] ?? "—",
          paymentMethodName: PAYMENT_METHOD_NAMES[r.paymentMethod] ?? "—",
          amount: r.amount,
          remarks: r.remarks ?? "",
          processedBy: createdByStr,
          createdAt: r.createdAt,
        }
      })
    )
    const settlement: SettlementDetailsView | undefined =
      b.status !== 0 && b.receiptNo != null && b.receiptNoString
        ? {
            receiptNo: b.receiptNo,
            receiptNoString: b.receiptNoString,
            paymentMethod: b.receiptPaymentMethod ?? 0,
            paymentMethodName: PAYMENT_METHOD_NAMES[b.receiptPaymentMethod ?? 0] ?? "—",
            amount: b.amount,
            settledAt: b.receiptNoCreatedAt ?? (receipt?.createdAt ?? b.updatedAt),
            bank: receipt?.bank ?? "",
            cardReference: receipt?.cardReference ?? "",
            slipReference: receipt?.slipReference ?? "",
          }
        : undefined

    const discountIds = [b.discountId, b.autoDiscountId].filter(Boolean) as string[]
    const discountRecords =
      discountIds.length > 0
        ? await prisma.discount.findMany({
            where: { id: { in: discountIds } },
            select: { id: true, name: true },
          })
        : []
    const manualDiscount = b.discountId
      ? discountRecords.find((d) => d.id === b.discountId)
      : null
    const autoDiscount = b.autoDiscountId
      ? discountRecords.find((d) => d.id === b.autoDiscountId)
      : null
    const discountDivision = b.discountDivision as { other_discount?: number } | null
    const otherDiscount = discountDivision?.other_discount ?? 0

    const discountInfo: DiscountInfoView = {
      total: b.discount,
      manualSchemeName: manualDiscount?.name ?? null,
      autoSchemeName: autoDiscount?.name ?? null,
      hospitalFeeDiscount: b.hospitalFeeDiscount ?? 0,
      professionalFeeDiscount: b.professionsalFeeDiscount ?? 0,
      otherDiscount,
    }

    const agencyRef = b.agencyRef?.trim() ?? ""
    const bookNumber = agencyRef.length >= 4 ? agencyRef.substring(0, agencyRef.length - 2) : null
    const agentInfo: AgentInfoView | null =
      b.agencyId && b.agency
        ? {
            agencyName: b.agency.name,
            agencyCode: b.agency.code ?? null,
            agencyRef,
            bookNumber,
          }
        : null

    const data: BookingDetailsView = {
      id: b.id,
      name: `${b.title} ${b.name}`.trim(),
      patientTitle: b.title ?? "",
      patientName: b.name ?? "",
      patientSex: b.sex ?? "",
      consultant,
      appointmentNo: b.appointmentNo,
      appointmentDate: formatAppointmentDate(sessionDate),
      appointmentTime,
      phone: b.phone,
      bookingMethod: methodName,
      agentRef: b.agencyRef?.trim() ? b.agencyRef : "-",
      referredBy: "",
      billNo: b.id,
      billSubTotal,
      discount: b.discount,
      billTotal: b.amount,
      billedBy: billedByStr,
      remark: b.remarks ?? "",
      area: b.area ?? "",
      foreigner: b.foriegner,
      status: b.status,
      createdAt: b.createdAt,
      discountInfo,
      agentInfo,
      settlement,
      receipts: receiptRows,
      refundableBreakdown:
        b.status === 1
          ? {
              professionalFee: b.professionalFee ?? 0,
              professionalDiscount: b.professionsalFeeDiscount ?? 0,
              refundableProfessional: Math.max(0, (b.professionalFee ?? 0) - (b.professionsalFeeDiscount ?? 0)),
              hospitalFee: b.hospitalFee ?? 0,
              hospitalDiscount: b.hospitalFeeDiscount ?? 0,
              refundableHospital: Math.max(0, (b.hospitalFee ?? 0) - (b.hospitalFeeDiscount ?? 0)),
            }
          : undefined,
      cancelOrRefundDetails:
        b.status === 2
          ? {
              refundAmount: b.refundAmount ?? 0,
              refundReceipts: receiptRows.filter((r) => r.type === "Refund"),
            }
          : undefined,
    }
    return { success: true, data }
  } catch (error) {
    console.error("getBookingDetailsService error", error)
    const message = error instanceof Error ? error.message : "Failed to load booking details"
    return { success: false, message }
  }
}
