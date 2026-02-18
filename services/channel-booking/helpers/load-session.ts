import prisma from "@/lib/prisma"
import { normalizeSessionTime } from "@/lib/utils"
import type { Session } from "@/types/booking.dashboard"

/**
 * Load session by id for save-booking. Returns session in same shape as get-sessions.
 * Caller must check: if !session then not found; if isPast then session start is before start of today (server time).
 */
export async function loadSessionForSaveBooking(
  sessionId: string
): Promise<{ session: Session | null; isPast: boolean }> {
  const r = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      doctor: { select: { id: true, title: true, name: true } },
      location: true,
      room: true,
    },
  })

  if (!r) {
    return { session: null, isPast: false }
  }

  const sessionDate = r.date instanceof Date ? r.date : new Date(r.date)
  const session: Session = {
    id: r.id,
    institution: r.institution,
    date: r.date,
    doctorSessionId: r.doctorSessionId,
    previousDoctorSession: r.previousDoctorSession,
    startTime: normalizeSessionTime(r.startTime as Date | number, sessionDate),
    endTime: normalizeSessionTime(r.endTime as Date | number, sessionDate),
    durationMinutes: r.durationMinutes,
    startingPatientNumber: r.startingPatientNumber,
    maxPatientNumber: r.maxPatientNumber,
    refundable: r.refundable,
    fees: r.fees,
    amountLocal: r.amountLocal,
    amountForeign: r.amountForeign,
    status: r.status,
    remarks: r.remarks,
    appointmentNo: r.appointmentNo,
    isScan: r.isScan,
    doctorId: r.doctorId,
    departmentId: r.departmentId,
    locationId: r.locationId,
    roomId: r.roomId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    doctor: r.doctor
      ? ({ id: r.doctor.id, title: r.doctor.title, name: r.doctor.name } as Session["doctor"])
      : undefined,
    location: r.location ?? undefined,
    room: r.room ?? undefined,
  }

  const sessionStart = normalizeSessionTime(r.startTime as Date | number, sessionDate)
  const isPast = sessionStart.getTime() < Date.now()

  return { session, isPast }
}
