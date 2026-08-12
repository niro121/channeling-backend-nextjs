import prisma from "@/lib/prisma"
import moment from "moment"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { userTypes } from "@/lib/roles"
import { saveBookingService } from "@/services/channel-booking/save-booking.service"
import {
  computeBookingDiscounts,
  getRefundFeeTypes,
  loadSessionForSaveBooking,
} from "@/services/channel-booking/helpers"
import type { SaveBookingInput, SaveBookingErrorCode } from "@/types/save-booking"
import {
  SAVE_BOOKING_METHOD_AGENT,
  SAVE_BOOKING_METHOD_ON_CALL,
  SAVE_PAYMENT_TYPE_AGENT,
  SAVE_PAYMENT_TYPE_CASH,
} from "@/types/save-booking"

export type PublicCreateAgentBookingParams = {
  sessionId: string
  /** Agency (agent) Mongo id — required for paid Agent bookings */
  agencyId?: string
  /** Full agency book reference — required for paid Agent bookings */
  bookReference?: string
  title: string
  name: string
  sex: string
  phone: string
  area: string
  remarks?: string
  foreigner?: boolean
  /**
   * When true: Agent booking, settled (receipt, status 1). Agency + bookReference required.
   * When false / omitted on advance-booking sessions: On-Call pending (status 0),
   * attached to API acting user as createdBy (no receipt). Agency + bookReference optional; saved if passed.
   * When omitted on non-advance sessions: same as true (Agent settled).
   */
  paid?: boolean
  /** From ApiClient.actingUserId — sets booking createdBy */
  createdByUserId: string
  /** OAuth API client document id (for activity metadata) */
  apiClientId?: string | null
}

export type PublicBookingFeeBreakdown = {
  professionalFee: number
  hospitalFee: number
  discount: number
  /** Total charged (after discount) */
  amount: number
}

const PUBLIC_BOOKING_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Paid",
  2: "Cancel",
  3: "Refund",
}

export type PublicCreateBookingDto = {
  id: string
  appointmentNo: number
  status: number
  statusLabel: string
  agencyRef: string
  bookingIdString: string | null
  receiptNoString: string | null
  amount: number
  fees: PublicBookingFeeBreakdown
  session: {
    id: string
    date: string
    startTimeFormatted: string
  }
  patient: {
    title: string
    name: string
    sex: string
    phone: string
    area: string
    remarks: string
    foreigner: boolean
  }
}

export type CreatePublicAgentBookingResult =
  | { success: true; data: PublicCreateBookingDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "booking_error" | "server_error"
      message: string
      /** Original save-booking error code when applicable */
      bookingErrorCode?: SaveBookingErrorCode
    }

type PublicBookingMode = "agent" | "on_call"

/**
 * Paid → Agent settled.
 * Unpaid / omitted on advance sessions → On-Call pending (createdBy = API acting user).
 * Unpaid on non-advance sessions is not allowed.
 */
function resolvePublicBookingMode(
  advanceBookingEnabled: boolean,
  paid?: boolean
): { mode: PublicBookingMode } | { error: string } {
  if (paid === true) return { mode: "agent" }
  if (paid === false) {
    if (!advanceBookingEnabled) {
      return {
        error:
          "Unpaid bookings are only allowed for advance-booking sessions (creates On-Call)",
      }
    }
    return { mode: "on_call" }
  }
  // omitted
  if (advanceBookingEnabled) return { mode: "on_call" }
  return { mode: "agent" }
}

function mapSaveBookingError(
  code: SaveBookingErrorCode
): "invalid_request" | "not_found" | "booking_error" | "server_error" {
  if (code === "INVALID_SESSION") return "not_found"
  if (
    code === "INVALID_INPUT" ||
    code === "DISCOUNT_ERROR" ||
    code === "AMOUNT_ERROR" ||
    code === "AGENCY_REF_ERROR" ||
    code === "PREVIOUS_SESSION_FILL" ||
    code === "CREDIT_LIMIT_VIOLATION" ||
    code === "AGENCY_CREDIT_EXCEED" ||
    code === "AGENCY_NO_LINKED_ACCOUNT" ||
    code === "LIMIT_EXCEEDED"
  ) {
    return "booking_error"
  }
  return "server_error"
}

function mapSuccessData(raw: unknown): PublicCreateBookingDto | null {
  if (!raw || typeof raw !== "object") return null
  const b = raw as Record<string, unknown>
  const session = b.session as Record<string, unknown> | undefined
  const sessionDate =
    session?.date instanceof Date
      ? session.date
      : session?.date
        ? new Date(String(session.date))
        : null
  const startTime = session?.startTime
  const status = Number(b.status ?? 0)
  return {
    id: String(b.id ?? ""),
    appointmentNo: Number(b.appointmentNo ?? 0),
    status,
    statusLabel: PUBLIC_BOOKING_STATUS_LABELS[status] ?? String(status),
    agencyRef: String(b.agencyRef ?? ""),
    bookingIdString: b.bookingid_string != null ? String(b.bookingid_string) : null,
    receiptNoString: b.receiptNoString != null ? String(b.receiptNoString) : null,
    amount: Number(b.amount ?? 0),
    fees: {
      professionalFee: Number(b.professionalFee ?? 0),
      hospitalFee: Number(b.hospitalFee ?? 0),
      discount: Number(b.discount ?? 0),
      amount: Number(b.amount ?? 0),
    },
    session: {
      id: String(session?.id ?? b.sessionId ?? ""),
      date: sessionDate ? moment(sessionDate).format("YYYY-MM-DD") : "",
      startTimeFormatted:
        startTime instanceof Date
          ? moment(startTime).format("h:mm A")
          : startTime
            ? moment(String(startTime)).format("h:mm A")
            : "",
    },
    patient: {
      title: String(b.title ?? ""),
      name: String(b.name ?? ""),
      sex: String(b.sex ?? ""),
      phone: String(b.phone ?? ""),
      area: String(b.area ?? ""),
      remarks: String(b.remarks ?? ""),
      foreigner: Boolean(b.foriegner),
    },
  }
}

/**
 * Create a public API booking via the channel-booking save pipeline.
 * Paid → Agent (settled). Unpaid advance → On-Call pending (createdBy = acting user).
 */
export async function createPublicAgentBooking(
  params: PublicCreateAgentBookingParams
): Promise<CreatePublicAgentBookingResult> {
  const sessionId = params.sessionId?.trim()
  const agencyId = params.agencyId?.trim() ?? ""
  const bookReference = params.bookReference?.trim().toUpperCase() ?? ""
  const title = params.title?.trim()
  const name = params.name?.trim()
  const sex = params.sex?.trim()
  const phone = params.phone?.trim()
  const area = params.area?.trim()

  if (!sessionId) {
    return { success: false, code: "invalid_request", message: "sessionId is required" }
  }
  if (!title || !name || !sex || !phone || !area) {
    return {
      success: false,
      code: "invalid_request",
      message: "title, name, sex, phone, and area are required",
    }
  }

  const createdByUserId = params.createdByUserId.trim()
  if (!createdByUserId) {
    return {
      success: false,
      code: "invalid_request",
      message: "API client acting user is required",
    }
  }
  const user = await prisma.user.findUnique({
    where: { id: createdByUserId },
    select: { id: true, userType: true, status: true },
  })
  if (!user || user.userType !== userTypes.apiUser || user.status !== 1) {
    return {
      success: false,
      code: "invalid_request",
      message: "API client user must be an active API User",
    }
  }

  const { session } = await loadSessionForSaveBooking(sessionId)
  if (!session) {
    return { success: false, code: "not_found", message: "Session not found" }
  }
  if (!session.doctor?.id && !session.doctorId) {
    return {
      success: false,
      code: "invalid_request",
      message: "Session has no doctor",
    }
  }

  const doctorSessionTemplate = session.doctorSessionId
    ? await prisma.doctorSession.findUnique({
        where: { id: session.doctorSessionId },
        select: { advancedBookingDays: true },
      })
    : null
  const advanceBookingEnabled =
    (doctorSessionTemplate?.advancedBookingDays ?? 0) > 0

  const modeResult = resolvePublicBookingMode(advanceBookingEnabled, params.paid)
  if ("error" in modeResult) {
    return { success: false, code: "invalid_request", message: modeResult.error }
  }
  const { mode } = modeResult
  const isOnCall = mode === "on_call"

  if (!isOnCall) {
    if (!agencyId) {
      return { success: false, code: "invalid_request", message: "agencyId is required" }
    }
    if (!bookReference) {
      return {
        success: false,
        code: "invalid_request",
        message: "bookReference is required",
      }
    }
  }

  if (agencyId) {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, status: true },
    })
    if (!agency || agency.status !== 1) {
      return {
        success: false,
        code: "not_found",
        message: "Agency not found or not published",
      }
    }
  } else if (isOnCall && bookReference) {
    return {
      success: false,
      code: "invalid_request",
      message: "agencyId is required when bookReference is provided",
    }
  }

  const doctorId = session.doctor?.id ?? session.doctorId!
  const foriegner = params.foreigner === true
  const payment_method = isOnCall
    ? SAVE_BOOKING_METHOD_ON_CALL
    : SAVE_BOOKING_METHOD_AGENT
  const payment_type = isOnCall ? SAVE_PAYMENT_TYPE_CASH : SAVE_PAYMENT_TYPE_AGENT

  const discountResult = await computeBookingDiscounts({
    autoDiscountId: null,
    manualDiscountId: null,
    payment_method,
    payment_type,
    session,
    foriegner,
    strict: true,
  })
  if (!discountResult.success) {
    return {
      success: false,
      code: "booking_error",
      message: discountResult.message,
      bookingErrorCode: "DISCOUNT_ERROR",
    }
  }

  const { professional_fee, hospital_fee } = getRefundFeeTypes(session.fees, foriegner)
  const baseAmount = professional_fee + hospital_fee
  const amount = Math.round((baseAmount - discountResult.discount_value) * 100) / 100

  const hasAgencyRef = Boolean(agencyId && bookReference)

  const input: SaveBookingInput = {
    title,
    name,
    sex,
    phone,
    area: { id: "", name: area },
    remarks: params.remarks?.trim() ?? "",
    foriegner,
    payment_method,
    payment_type,
    ...(hasAgencyRef
      ? {
          agency: { id: agencyId },
          agency_ref: bookReference,
        }
      : {}),
    session: { id: sessionId },
    doctor: {
      id: doctorId,
      title: session.doctor?.title,
      name: session.doctor?.name,
    },
    amount,
    discount: discountResult.discount_value,
  }

  const result = await saveBookingService(input, createdByUserId, {
    requireActiveShift: false,
    agencyRefUniqueOnly: hasAgencyRef,
    // On-Call never creates a receipt; Agent paid path settles.
    settleOnCreate: !isOnCall,
  })

  if (!result.success) {
    return {
      success: false,
      code: mapSaveBookingError(result.errorCode),
      message: result.message,
      bookingErrorCode: result.errorCode,
    }
  }

  const data = mapSuccessData(result.data)
  if (!data) {
    return {
      success: false,
      code: "server_error",
      message: "Booking created but response could not be mapped",
    }
  }

  logActivityNonBlocking({
    userId: createdByUserId,
    action: "channel-booking.booking.created",
    entityType: "Booking",
    entityId: data.id,
    importance: "high",
    metadata: {
      sessionId,
      source: "public-api",
      apiClientId: params.apiClientId ?? undefined,
      bookingMode: mode,
    },
  })

  return { success: true, data }
}
