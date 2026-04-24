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
  institution: number
  locationId: string | null
  channelCurrentPatientNumber: number
  doctorName: string
  roomNumber: string | null
  locationName: string | null
  startTime: Date
  endTime: Date
  bookings: ChannelRoomBookingRow[]
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
    const bookings = await prisma.booking.findMany({
      where: { sessionId: session.id, status: 1 },
      orderBy: { appointmentNo: "asc" },
      select: {
        id: true,
        appointmentNo: true,
        receiptNoString: true,
        title: true,
        name: true,
        channelRoomAttendance: true,
      },
    })

    const doctorName = [session.doctor?.title, session.doctor?.name].filter(Boolean).join(" ").trim() || "—"

    const data: ChannelRoomSessionDetail = {
      sessionId: session.id,
      institution: session.institution,
      locationId: session.locationId ?? null,
      channelCurrentPatientNumber: session.channelCurrentPatientNumber,
      doctorName,
      roomNumber: session.room?.number ?? null,
      locationName: session.location?.name ?? null,
      startTime: normalizeSessionTime(session.startTime as Date | number, sessionDate),
      endTime: normalizeSessionTime(session.endTime as Date | number, sessionDate),
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
