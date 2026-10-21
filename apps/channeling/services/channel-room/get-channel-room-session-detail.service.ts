"use server"

import prisma from "@/lib/prisma"
import { isSessionDoctorArrived } from "@/lib/channel-room/is-session-doctor-arrived"
import { normalizeSessionTime } from "@/lib/utils"

export type ChannelRoomBookingRow = {
  id: string
  appointmentNo: number
  receiptNoString: string | null
  title: string
  name: string
  channelRoomAttendance: number | null
}

export type ChannelRoomSessionDetail = {
  sessionId: string
  relatedSessionIds: string[]
  institution: number
  locationId: string | null
  channelCurrentPatientNumber: number
  doctorName: string
  roomNumber: string | null
  locationName: string | null
  startTime: Date
  endTime: Date
  bookingGroups: Array<{
    sessionId: string
    startTime: Date
    endTime: Date
    bookings: ChannelRoomBookingRow[]
  }>
  bookings: ChannelRoomBookingRow[]
}

type ChainSession = {
  id: string
  doctorSessionId: string
  previousDoctorSession: string | null
  date: Date
  startTime: Date
  endTime: Date
}

function buildSessionChain(
  chainStart: ChainSession,
  sessionsSameDay: ChainSession[]
): { chainSessionIds: string[]; anchorSessionId: string } {
  const byDoctorSessionId = new Map(sessionsSameDay.map((s) => [s.doctorSessionId, s]))
  const byPreviousDoctorSession = new Map<string, ChainSession>()
  for (const s of sessionsSameDay) {
    if (s.previousDoctorSession) byPreviousDoctorSession.set(s.previousDoctorSession, s)
  }

  const chain = new Map<string, ChainSession>([[chainStart.id, chainStart]])
  let cursor: ChainSession | undefined = chainStart
  while (cursor?.previousDoctorSession) {
    const parent = byDoctorSessionId.get(cursor.previousDoctorSession)
    if (!parent || chain.has(parent.id)) break
    chain.set(parent.id, parent)
    cursor = parent
  }
  const anchorSessionId = cursor?.id ?? chainStart.id

  cursor = chainStart
  while (cursor) {
    const next = byPreviousDoctorSession.get(cursor.doctorSessionId)
    if (!next || chain.has(next.id)) break
    chain.set(next.id, next)
    cursor = next
  }

  return { chainSessionIds: [...chain.keys()], anchorSessionId }
}

export async function getChannelRoomSessionDetailService(sessionId: string): Promise<{
  success: boolean
  errorCode?: string
  data?: ChannelRoomSessionDetail
  message?: string
}> {
  try {
    if (!sessionId?.trim()) {
      return { success: false, errorCode: "invalid_input", message: "Session ID is required." }
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId.trim() },
      include: {
        doctor: { select: { title: true, name: true } },
        room: { select: { number: true } },
        location: { select: { name: true } },
      },
    })

    if (!session) {
      return { success: false, errorCode: "not_found", message: "Session not found." }
    }

    if (
      !isSessionDoctorArrived({
        doctorArrivalTime: session.doctorArrivalTime,
        doctorDepatureTime: session.doctorDepatureTime,
      })
    ) {
      return {
        success: false,
        errorCode: "doctor_not_arrived",
        message: "Channel room opens only after doctor arrival.",
      }
    }

    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date)
    const dayStart = new Date(sessionDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(sessionDate)
    dayEnd.setHours(23, 59, 59, 999)

    const sessionsSameDayRaw = await prisma.session.findMany({
      where: {
        doctorId: session.doctorId ?? undefined,
        date: { gte: dayStart, lte: dayEnd },
      },
      select: {
        id: true,
        doctorSessionId: true,
        previousDoctorSession: true,
        date: true,
        startTime: true,
        endTime: true,
      },
    })
    const sessionsSameDay: ChainSession[] = sessionsSameDayRaw
      .filter((s): s is ChainSession => Boolean(s.doctorSessionId))
      .map((s) => ({
        id: s.id,
        doctorSessionId: s.doctorSessionId as string,
        previousDoctorSession: s.previousDoctorSession ?? null,
        date: s.date,
        startTime: s.startTime as Date,
        endTime: s.endTime as Date,
      }))

    const chainStart: ChainSession = {
      id: session.id,
      doctorSessionId: (session as unknown as { doctorSessionId: string }).doctorSessionId,
      previousDoctorSession: (session as unknown as { previousDoctorSession: string | null }).previousDoctorSession,
      date: sessionDate,
      startTime: session.startTime as Date,
      endTime: session.endTime as Date,
    }
    const { chainSessionIds, anchorSessionId } = buildSessionChain(chainStart, sessionsSameDay)
    const bySession = new Map(sessionsSameDay.map((s) => [s.id, s]))
    const orderedChain = chainSessionIds
      .map((id) => bySession.get(id))
      .filter((s): s is ChainSession => Boolean(s))
      .sort((a, b) => normalizeSessionTime(a.startTime, a.date).getTime() - normalizeSessionTime(b.startTime, b.date).getTime())

    const bookings = await prisma.booking.findMany({
      where: { sessionId: { in: chainSessionIds }, status: 1 },
      orderBy: { appointmentNo: "asc" },
      select: {
        id: true,
        sessionId: true,
        appointmentNo: true,
        receiptNoString: true,
        title: true,
        name: true,
        channelRoomAttendance: true,
      },
    })

    const doctorName = [session.doctor?.title, session.doctor?.name].filter(Boolean).join(" ").trim() || "—"

    const bookingGroups = orderedChain.map((s) => ({
      sessionId: s.id,
      startTime: normalizeSessionTime(s.startTime, s.date),
      endTime: normalizeSessionTime(s.endTime, s.date),
      bookings: bookings
        .filter((b) => b.sessionId === s.id)
        .map((b) => ({
          id: b.id,
          appointmentNo: b.appointmentNo,
          receiptNoString: b.receiptNoString ?? null,
          title: b.title,
          name: b.name,
          channelRoomAttendance: b.channelRoomAttendance ?? null,
        })),
    }))

    const data: ChannelRoomSessionDetail = {
      sessionId: anchorSessionId,
      relatedSessionIds: chainSessionIds,
      institution: session.institution,
      locationId: session.locationId ?? null,
      channelCurrentPatientNumber: session.channelCurrentPatientNumber,
      doctorName,
      roomNumber: session.room?.number ?? null,
      locationName: session.location?.name ?? null,
      startTime: normalizeSessionTime(session.startTime as Date | number, sessionDate),
      endTime: normalizeSessionTime(session.endTime as Date | number, sessionDate),
      bookingGroups,
      bookings: bookings.map((b) => ({
        id: b.id,
        appointmentNo: b.appointmentNo,
        receiptNoString: b.receiptNoString ?? null,
        title: b.title,
        name: b.name,
        channelRoomAttendance: b.channelRoomAttendance ?? null,
      })),
    }

    return { success: true, data }
  } catch (e) {
    console.error("getChannelRoomSessionDetailService", e)
    return {
      success: false,
      errorCode: "server_error",
      message: e instanceof Error ? e.message : "Failed to load session.",
    }
  }
}
