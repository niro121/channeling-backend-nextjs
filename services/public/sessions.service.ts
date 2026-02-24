import prisma from "@/lib/prisma"
import { getSessionsForChannelBookingService } from "@/services/channel-booking/get-sessions.service"
import moment from "moment"
import type { Session } from "@/types/booking.dashboard"

/** Public API session DTO (no audit fields). */
export type PublicSessionDto = {
  id: string
  date: Date
  startTime: Date
  endTime: Date
  status: number
  amountLocal: number | null
  amountForeign: number | null
  maxPatientNumber: number
  appointmentNo: number
  location: { id: string; name: string } | null
  room: { id: string; number: string } | null
  doctor: { id: string; title: string; name: string; code: string }
  paidCount: number
  pendingCount: number
}

export type GetPublicSessionsResult =
  | { success: true; data: PublicSessionDto[] }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

/**
 * Get sessions for public API by doctor code.
 * Resolves doctor by code, fetches sessions from channel-booking service, maps to public DTO.
 */
export async function getPublicSessionsByDoctorCode(
  doctorCode: string,
  fromDateParam?: string | null
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

  const sessions: PublicSessionDto[] = result.data.map((s: Session) => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    amountLocal: s.amountLocal ?? null,
    amountForeign: s.amountForeign ?? null,
    maxPatientNumber: s.maxPatientNumber,
    appointmentNo: s.appointmentNo,
    location: s.location
      ? { id: s.location.id!, name: s.location.name }
      : null,
    room: s.room
      ? { id: s.room.id!, number: s.room.number }
      : null,
    doctor: {
      id: doctor.id,
      title: doctor.title,
      name: doctor.name,
      code: doctor.code,
    },
    paidCount: s.paidCount ?? 0,
    pendingCount: s.pendingCount ?? 0,
  }))

  return { success: true, data: sessions }
}
