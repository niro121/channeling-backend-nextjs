import prisma from "@/lib/prisma"
import { normalizeSessionTime } from "@/lib/utils"
import { BOOKING_METHODS } from "@/types/channel-booking"
import { PAYMENT_METHOD_NAMES, RECEIPT_METHOD_NAMES } from "@/types/receipt"
import { resolveUser } from "./helpers/resolve-user"

function parseArrivalDepartureForSettle(json: unknown): { time: string; createdBy: string }[] {
  if (!Array.isArray(json)) return []
  return json.filter(
    (item): item is { time: string; createdBy: string } =>
      item != null &&
      typeof item === "object" &&
      "time" in item &&
      "createdBy" in item &&
      typeof (item as { time: string }).time === "string" &&
      typeof (item as { createdBy: string }).createdBy === "string"
  )
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
  paymentLines: Array<{ paymentMethod: number; paymentMethodName: string; amount: number }>
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

/** Credit-customer info for the Booking tab (when booking method is Credit Customer). */
export type CreditCustomerInfoView = {
  creditCustomerName: string
  creditCustomerCode: string | null
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
  /** Legacy combined string; prefer referredDoctor, referredAgency, referredStaff for display. */
  referredBy: string
  referredDoctor: string | null
  referredAgency: string | null
  referredStaff: string | null
  billNo: string
  billSubTotal: number
  discount: number
  billTotal: number
  billedBy: string
  remark: string
  area: string
  foreigner: boolean
  status: number
  /** 0 = none, 1 = prof only, 2 = hosp only, 3 = full. Used with status for canceled/refunded state. */
  refund: number
  createdAt: Date
  /** Discount breakdown and scheme names for display. */
  discountInfo: DiscountInfoView
  /** When booking method is Agent: agency and financial details. */
  agentInfo: AgentInfoView | null
  /** When booking method is Credit Customer: company name and code. */
  creditCustomerInfo: CreditCustomerInfoView | null
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
  /** When status === 2 or refund !== 0: refund amount and refund receipts for Cancel/Refund tab. */
  cancelOrRefundDetails?: CancelOrRefundDetailsView
  /** When booking was transferred: move details for Booking tab. */
  movedAt: Date | null
  movedBy: string | null
  movedRemarks: string | null
  /** Formatted date/time of original session (fallback when movedFromSession is absent). */
  movedFrom: string | null
  /** Session status (1 = ACTIVE, 0 = on leave). Used by Settle tab to block when doctor on leave. */
  sessionStatus?: number
  /** Session refundable: 0 = non-refundable, 1 = refundable. Used by Cancel/Refund tabs. */
  sessionRefundable?: number
  /** True when doctor has been paid for this booking; refund and cancel are not allowed. */
  doctorPayment?: boolean
  /** Session date YYYY-MM-DD for Settle tab (past date = cannot settle). */
  sessionDateForSettle?: string
  /** False if doctor has departed and no arrival after last departure. Settle tab blocks when false. */
  sessionCanSettleArrival?: boolean
  /** When movedFromSessionId is set: session the booking was moved from. */
  movedFromSession: {
    id: string
    doctorName: string
    date: string
    time: string
    /** Single-line summary e.g. "Dr X, 22 Feb 2025, 10:00 AM". */
    summary: string
  } | null
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

function formatMoney2(amount: number): string {
  return Number(amount ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
        receipts: {
          orderBy: { createdAt: "desc" },
          include: { paymentLines: true },
        },
        agency: true,
        creditCustomer: true,
        referredStaff: true,
        movedFromSession: {
          include: { doctor: { select: { title: true, name: true } } },
        },
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
    const billedByStr = `${createdByName} - ${b.createdAt.toLocaleString("en-CA", { dateStyle: "short", timeStyle: "medium" })}`
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
          paymentMethodName:
            r.paymentLines.length > 0
              ? r.paymentLines
                  .map((line) => `${PAYMENT_METHOD_NAMES[line.paymentMethod] ?? "—"} ${formatMoney2(line.amount)}`)
                  .join(" + ")
              : PAYMENT_METHOD_NAMES[r.paymentMethod] ?? "—",
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
            paymentLines: (receipt?.paymentLines ?? []).map((line) => ({
              paymentMethod: line.paymentMethod,
              paymentMethodName: PAYMENT_METHOD_NAMES[line.paymentMethod] ?? "—",
              amount: line.amount,
            })),
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

    const [referredDoctorRecord, referredAgencyRecord] = await Promise.all([
      b.referredDoctorId
        ? prisma.doctor.findUnique({ where: { id: b.referredDoctorId }, select: { title: true, name: true } })
        : null,
      b.referredAgencyId
        ? prisma.agency.findUnique({ where: { id: b.referredAgencyId }, select: { name: true } })
        : null,
    ])
    const referredDoctorName =
      referredDoctorRecord != null ? `${referredDoctorRecord.title ?? ""} ${referredDoctorRecord.name ?? ""}`.trim() || null : null
    const referredAgencyName = referredAgencyRecord?.name ?? null
    const referredStaffName =
      b.referredStaff != null ? [b.referredStaff.name, b.referredStaff.code].filter(Boolean).join(" ").trim() || null : null
    const referredParts = [referredDoctorName, referredAgencyName, referredStaffName].filter(Boolean)
    const referredBy = referredParts.length > 0 ? referredParts.join(" · ") : ""

    const movedByUserId = (b as { movedBy?: string | null }).movedBy ?? null
    const movedAt = (b as { movedAt?: Date | null }).movedAt ?? null
    const movedRemarks = (b as { movedRemarks?: string | null }).movedRemarks ?? null
    const movedFromSessionStartTime = (b as { movedFromSessionStartTime?: number | null }).movedFromSessionStartTime ?? null
    const movedByUserName = movedByUserId ? await resolveUser(movedByUserId) : null
    const rawMovedFromSession = (b as { movedFromSession?: { id: string; date: Date; startTime: Date | number; doctor?: { title: string | null; name: string } | null } | null }).movedFromSession ?? null
    let movedFrom: string | null = null
    let movedFromSession: BookingDetailsView["movedFromSession"] = null
    if (rawMovedFromSession) {
      const sessionDate = rawMovedFromSession.date instanceof Date ? rawMovedFromSession.date : new Date(rawMovedFromSession.date)
      const startTime = normalizeSessionTime(rawMovedFromSession.startTime as Date | number, sessionDate)
      const doctorName = rawMovedFromSession.doctor
        ? `${rawMovedFromSession.doctor.title ?? ""} ${rawMovedFromSession.doctor.name ?? ""}`.trim() || "—"
        : "—"
      const dateStr = formatAppointmentDate(sessionDate)
      const timeStr = formatAppointmentTime(startTime)
      movedFromSession = {
        id: rawMovedFromSession.id,
        doctorName,
        date: dateStr,
        time: timeStr,
        summary: `${doctorName}, ${dateStr}, ${timeStr}`,
      }
      movedFrom = movedFromSession.summary
    } else if (movedFromSessionStartTime != null) {
      movedFrom = new Date(movedFromSessionStartTime * 1000).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
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

    const creditCustomerInfo: CreditCustomerInfoView | null =
      b.creditCustomerId && b.creditCustomer
        ? {
            creditCustomerName: b.creditCustomer.name,
            creditCustomerCode: b.creditCustomer.code ?? null,
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
      referredBy,
      referredDoctor: referredDoctorName,
      referredAgency: referredAgencyName,
      referredStaff: referredStaffName,
      billNo:
        b.receiptNo != null && b.receiptNoString != null
          ? b.receiptNoString
          : ((b as { bookingid_string?: string | null }).bookingid_string ?? b.id),
      billSubTotal,
      discount: b.discount,
      billTotal: b.amount,
      billedBy: billedByStr,
      remark: b.remarks ?? "",
      area: b.area ?? "",
      foreigner: b.foriegner,
      status: b.status,
      refund: b.refund ?? 0,
      createdAt: b.createdAt,
      discountInfo,
      agentInfo,
      creditCustomerInfo,
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
        b.status === 2 || (b.refund != null && b.refund !== 0)
          ? {
              refundAmount: b.refundAmount ?? 0,
              refundReceipts: receiptRows.filter((r) => r.type === "Refund"),
            }
          : undefined,
      movedAt: movedAt ?? null,
      movedBy: movedByUserName ?? null,
      movedRemarks: movedRemarks ?? null,
      movedFrom: movedFrom ?? null,
      movedFromSession,
      sessionStatus: b.session?.status,
      sessionRefundable: b.session?.refundable,
      doctorPayment: b.doctorPayment ?? false,
      sessionDateForSettle: b.session?.date
        ? new Date(b.session.date).toISOString().slice(0, 10)
        : undefined,
      sessionCanSettleArrival: (() => {
        const arrivals = parseArrivalDepartureForSettle(b.session?.doctorArrivalTime)
        const departures = parseArrivalDepartureForSettle(b.session?.doctorDepatureTime)
        if (departures.length === 0) return true
        const lastDep = Math.max(...departures.map((e) => parseInt(e.time, 10) || 0))
        return arrivals.some((e) => (parseInt(e.time, 10) || 0) > lastDep)
      })(),
    }
    return { success: true, data }
  } catch (error) {
    console.error("getBookingDetailsService error", error)
    const message = error instanceof Error ? error.message : "Failed to load booking details"
    return { success: false, message }
  }
}
