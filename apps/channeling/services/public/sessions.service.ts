import prisma from "@/lib/prisma"
import { getSessionsForChannelBookingService } from "@/services/channel-booking/get-sessions.service"
import {
  loadPublicPricingContext,
  parsePublicPaymentMode,
  pricePublicSessionFees,
  type PublicPaymentMode,
  type PublicSessionFeeBreakdown,
} from "@/services/public/public-session-pricing"
import moment from "moment"
import type { Session } from "@/types/booking.dashboard"

export type { PublicSessionFeeBreakdown, PublicPaymentMode }

/** Public API session DTO (no audit fields, no room/paid/pending counts). */
export type PublicSessionDto = {
  id: string
  /** Session date as YYYY-MM-DD */
  date: string
  startTime: Date
  /** Session start time as readable string, e.g. "7:00 PM" */
  startTimeFormatted: string
  endTime: Date
  /** 1 = bookable, 0 = disabled (on leave, ended, previous session not full, or at max capacity) */
  status: number
  /** True when this session is marked as doctor on leave in the system */
  doctorOnLeave: boolean
  /** First appointment number for this session */
  minPatientNumber: number
  /** Last bookable appointment number for this session */
  maxPatientNumber: number
  /** Highest appointment number issued so far on this session */
  appointmentNo: number
  /** True when appointmentNo has reached maxPatientNumber (no more bookings) */
  isFull: boolean
  /** True when the doctor session template allows advance booking */
  advancedBookingEnabled: boolean
  amountLocal: PublicSessionFeeBreakdown
  amountForeign: PublicSessionFeeBreakdown
  /** API catalog row (id 6); 0 unless paymentMode is api. Already included in hospitalFee. */
  apiFeeLocal: number
  apiFeeForeign: number
  paymentMode: PublicPaymentMode
  location: { id: string; name: string; city: string } | null
  doctor: { id: string; title: string; name: string; code: string }
}

export type GetPublicSessionsResult =
  | { success: true; data: PublicSessionDto[] }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

function sessionDateKey(date: Date | string): string {
  return moment(date).format("YYYY-MM-DD")
}

function sessionLookupKey(date: Date | string, doctorSessionId: string): string {
  return `${sessionDateKey(date)}:${doctorSessionId}`
}

/**
 * Same rule as channel booking save/transfer: walk the previousDoctorSession chain
 * on the same day; every predecessor must be full before this session is bookable.
 */
function isConsecutiveChainFull(
  session: Session,
  sessionByDoctorSessionOnDate: Map<string, Session>,
  isSessionFull: (s: Session) => boolean
): boolean {
  let previousDoctorSessionId = session.previousDoctorSession
  while (previousDoctorSessionId) {
    const previous = sessionByDoctorSessionOnDate.get(
      sessionLookupKey(session.date, previousDoctorSessionId)
    )
    if (!previous) {
      return true
    }
    if (!isSessionFull(previous)) {
      return false
    }
    previousDoctorSessionId = previous.previousDoctorSession
  }
  return true
}

/**
 * Get sessions for public API by doctor code.
 * Resolves doctor by code, fetches sessions from channel-booking service, maps to public DTO.
 */
export async function getPublicSessionsByDoctorCode(
  doctorCode: string,
  fromDateParam?: string | null,
  paymentModeParam?: string | null
): Promise<GetPublicSessionsResult> {
  const fromDate = fromDateParam
    ? moment(fromDateParam, "YYYY-MM-DD", true).startOf("day").toDate()
    : moment().startOf("day").toDate()

  if (fromDateParam && !moment(fromDateParam, "YYYY-MM-DD", true).isValid()) {
    return {
      success: false,
      code: "invalid_request",
      message: "fromDate must be YYYY-MM-DD",
    }
  }

  const modeParsed = parsePublicPaymentMode(paymentModeParam)
  if (!modeParsed.ok) {
    return {
      success: false,
      code: "invalid_request",
      message: modeParsed.message,
    }
  }

  const doctor = await prisma.doctor.findUnique({
    where: { code: doctorCode },
    select: { id: true, code: true, title: true, name: true },
  })

  if (!doctor) {
    return {
      success: false,
      code: "not_found",
      message: "Doctor not found for the given doctor code",
    }
  }

  const result = await getSessionsForChannelBookingService(doctor.id, fromDate)

  if (!result.success || result.data === undefined) {
    return {
      success: false,
      code: "server_error",
      message: result.message ?? "Failed to fetch sessions",
    }
  }

  const now = new Date()
  const orderedSessions = [...result.data].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    if (dateA !== dateB) return dateA - dateB
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  })

  const isFull = (s: Session) => (s.appointmentNo ?? 0) >= (s.maxPatientNumber ?? 0)
  const isEndTimePassed = (s: Session) => new Date(s.endTime).getTime() <= now.getTime()

  const sessionByDoctorSessionOnDate = new Map<string, Session>()
  for (const s of orderedSessions) {
    sessionByDoctorSessionOnDate.set(
      sessionLookupKey(s.date, s.doctorSessionId),
      s
    )
  }

  const doctorSessionIds = [
    ...new Set(orderedSessions.map((s) => s.doctorSessionId).filter(Boolean)),
  ]
  const doctorSessionTemplates =
    doctorSessionIds.length > 0
      ? await prisma.doctorSession.findMany({
          where: { id: { in: doctorSessionIds } },
          select: { id: true, advancedBookingEnabled: true },
        })
      : []
  const advancedBookingEnabledByTemplate = new Map(
    doctorSessionTemplates.map((template) => [
      template.id,
      template.advancedBookingEnabled ?? false,
    ])
  )

  const pricingContext = await loadPublicPricingContext(modeParsed.mode)

  const sessions: PublicSessionDto[] = orderedSessions.map((s: Session) => {
    const consecutiveChainFull = isConsecutiveChainFull(
      s,
      sessionByDoctorSessionOnDate,
      isFull
    )
    const onLeave = s.status === 0
    const endTimePassed = isEndTimePassed(s)
    const sessionFull = isFull(s)
    const bookable =
      !onLeave && !endTimePassed && consecutiveChainFull && !sessionFull
    const status = bookable ? 1 : 0
    const priced = pricePublicSessionFees(s.fees, pricingContext)
    const minPatientNumber = s.startingPatientNumber ?? 0
    const maxPatientNumber = s.maxPatientNumber ?? 0
    const appointmentNo = s.appointmentNo ?? 0
    const advancedBookingEnabled =
      advancedBookingEnabledByTemplate.get(s.doctorSessionId) ?? false
    return {
      id: s.id,
      date: moment(s.date).format("YYYY-MM-DD"),
      startTime: s.startTime,
      startTimeFormatted: moment(s.startTime).format("h:mm A"),
      endTime: s.endTime,
      status,
      doctorOnLeave: onLeave,
      minPatientNumber,
      maxPatientNumber,
      appointmentNo,
      isFull: sessionFull,
      advancedBookingEnabled,
      amountLocal: priced.local,
      amountForeign: priced.foreign,
      apiFeeLocal: priced.apiFeeLocal,
      apiFeeForeign: priced.apiFeeForeign,
      paymentMode: priced.paymentMode,
      location: s.location
        ? { id: s.location.id!, name: s.location.name, city: s.location.city }
        : null,
      doctor: {
        id: doctor.id,
        title: doctor.title,
        name: doctor.name,
        code: doctor.code,
      },
    }
  })

  return { success: true, data: sessions }
}
