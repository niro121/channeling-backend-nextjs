"use server"

import prisma from "@/lib/prisma"
import { isSessionDoctorArrived } from "@/lib/channel-room/is-session-doctor-arrived"
import { emitChannelRoomUpdate } from "@/services/channel-room/emit-channel-room-update"
import moment from "moment"

type AttendanceValue = 1 | 2 | null

export type ChannelRoomAttendanceHistoryEntry = {
  from: AttendanceValue
  to: AttendanceValue
  at: string
  by: string
}

function parseAttendanceHistory(json: unknown): ChannelRoomAttendanceHistoryEntry[] {
  if (!Array.isArray(json)) return []
  return json.filter((item): item is ChannelRoomAttendanceHistoryEntry => {
    if (!item || typeof item !== "object") return false
    const candidate = item as Partial<ChannelRoomAttendanceHistoryEntry>
    const validValue = (v: unknown) => v === null || v === 1 || v === 2
    return validValue(candidate.from) && validValue(candidate.to) && typeof candidate.at === "string" && typeof candidate.by === "string"
  })
}

export type SetChannelRoomAttendanceInput = {
  bookingId: string
  /** 1 = showed, 2 = no-show, null = revert to pending */
  attendance: AttendanceValue
}

export type SetChannelRoomAttendanceResult =
  | {
      success: true
      sessionId: string
      channelCurrentPatientNumber: number
      attendance: AttendanceValue
    }
  | { success: false; errorCode: string; message: string }

export async function setChannelRoomAttendanceService(
  input: SetChannelRoomAttendanceInput,
  userId: string
): Promise<SetChannelRoomAttendanceResult> {
  const { bookingId, attendance } = input
  if (!bookingId?.trim()) {
    return { success: false, errorCode: "invalid_input", message: "Booking ID is required." }
  }
  if (attendance !== 1 && attendance !== 2 && attendance !== null) {
    return { success: false, errorCode: "invalid_input", message: "Attendance must be 1 (show), 2 (no-show), or null (revert)." }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId.trim() },
        include: {
          session: true,
        },
      })

      if (!booking || !booking.sessionId || !booking.session) {
        return { ok: false as const, code: "not_found", message: "Booking not found." }
      }
      if (booking.status !== 1) {
        return { ok: false as const, code: "invalid_booking", message: "Only paid bookings can be marked in the channel room." }
      }

      const currentAttendance = (booking.channelRoomAttendance === 1 || booking.channelRoomAttendance === 2)
        ? booking.channelRoomAttendance
        : null

      if (currentAttendance === attendance) {
        return { ok: false as const, code: "no_change", message: "Attendance is already in this state." }
      }

      const sess = booking.session
      const sessionDate = sess.date instanceof Date ? sess.date : new Date(sess.date)
      const today = moment().format("YYYY-MM-DD")
      if (moment(sessionDate).format("YYYY-MM-DD") !== today) {
        return { ok: false as const, code: "invalid_date", message: "Channel room attendance can only be set for today's session." }
      }

      if (
        !isSessionDoctorArrived({
          doctorArrivalTime: sess.doctorArrivalTime,
          doctorDepatureTime: sess.doctorDepatureTime,
        })
      ) {
        return {
          ok: false as const,
          code: "doctor_not_arrived",
          message: "Channel room opens only after doctor arrival.",
        }
      }

      const history = parseAttendanceHistory((booking as unknown as { channelRoomAttendanceHistory?: unknown }).channelRoomAttendanceHistory)
      history.push({
        from: currentAttendance,
        to: attendance,
        at: new Date().toISOString(),
        by: userId,
      })

      const newBoard = attendance == null
        ? sess.channelCurrentPatientNumber
        : Math.max(sess.channelCurrentPatientNumber, booking.appointmentNo)

      await (tx as unknown as { booking: { update: (args: object) => Promise<unknown> } }).booking.update({
        where: { id: booking.id },
        data: {
          channelRoomAttendance: attendance,
          channelRoomAttendanceAt: attendance == null ? null : new Date(),
          channelRoomAttendanceBy: attendance == null ? null : userId,
          channelRoomAttendanceHistory: history as unknown as object,
          updatedBy: userId,
        },
      })

      if (newBoard !== sess.channelCurrentPatientNumber) {
        await tx.session.update({
          where: { id: sess.id },
          data: { channelCurrentPatientNumber: newBoard },
        })
      }

      return {
        ok: true as const,
        sessionId: sess.id,
        channelCurrentPatientNumber: newBoard,
        institution: sess.institution,
        locationId: sess.locationId ?? null,
        attendance,
      }
    })

    if (!result.ok) {
      return { success: false, errorCode: result.code, message: result.message }
    }

    emitChannelRoomUpdate({
      kind: "attendance",
      sessionId: result.sessionId,
      channelCurrentPatientNumber: result.channelCurrentPatientNumber,
      institution: result.institution,
      locationId: result.locationId,
    })

    return {
      success: true,
      sessionId: result.sessionId,
      channelCurrentPatientNumber: result.channelCurrentPatientNumber,
      attendance: result.attendance,
    }
  } catch (e) {
    console.error("setChannelRoomAttendanceService", e)
    return {
      success: false,
      errorCode: "server_error",
      message: e instanceof Error ? e.message : "Failed to update attendance.",
    }
  }
}
