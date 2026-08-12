import prisma from "@/lib/prisma"
import { getRefundFeeTypes } from "@/services/channel-booking/helpers"
import type { PublicSessionDto } from "@/services/public/sessions.service"
import moment from "moment"
import type { Session } from "@/types/booking.dashboard"

type DoctorSummary = {
  id: string
  code: string
  title: string
  name: string
}

function sessionDateKey(date: Date | string): string {
  return moment(date).format("YYYY-MM-DD")
}

function sessionLookupKey(date: Date | string, doctorSessionId: string): string {
  return `${sessionDateKey(date)}:${doctorSessionId}`
}

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
    if (!previous) return true
    if (!isSessionFull(previous)) return false
    previousDoctorSessionId = previous.previousDoctorSession
  }
  return true
}

/** Maps channel-booking session rows to the mobile app / public session DTO shape. */
export async function mapDoctorAppSessionsToDto(
  rawSessions: Session[],
  doctor: DoctorSummary
): Promise<PublicSessionDto[]> {
  const now = new Date()
  const orderedSessions = [...rawSessions].sort((a, b) => {
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
          select: { id: true, advancedBookingDays: true },
        })
      : []
  const advancedBookingDaysByTemplate = new Map(
    doctorSessionTemplates.map((template) => [
      template.id,
      template.advancedBookingDays ?? 0,
    ])
  )

  return orderedSessions.map((s) => {
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

    const localParts = getRefundFeeTypes(s.fees, false)
    const foreignParts = getRefundFeeTypes(s.fees, true)
    const localAmount = localParts.professional_fee + localParts.hospital_fee
    const foreignAmount = foreignParts.professional_fee + foreignParts.hospital_fee

    const amountLocal = {
      professionalFee: localParts.professional_fee,
      hospitalFee: localParts.hospital_fee,
      amount: s.amountLocal ?? localAmount,
    }
    const amountForeign = {
      professionalFee: foreignParts.professional_fee,
      hospitalFee: foreignParts.hospital_fee,
      amount: s.amountForeign ?? foreignAmount,
    }

    const advancedBookingDays =
      advancedBookingDaysByTemplate.get(s.doctorSessionId) ?? 0

    return {
      id: s.id,
      date: moment(s.date).format("YYYY-MM-DD"),
      startTime: s.startTime,
      startTimeFormatted: moment(s.startTime).format("h:mm A"),
      endTime: s.endTime,
      status: bookable ? 1 : 0,
      doctorOnLeave: onLeave,
      minPatientNumber: s.startingPatientNumber ?? 0,
      maxPatientNumber: s.maxPatientNumber ?? 0,
      appointmentNo: s.appointmentNo ?? 0,
      isFull: sessionFull,
      advancedBookingEnabled: advancedBookingDays > 0,
      advancedBookingDays,
      amountLocal,
      amountForeign,
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
}
