"use server"

import prisma from "@/lib/prisma"
import { isSessionDoctorArrived } from "@/lib/channel-room/is-session-doctor-arrived"
import { normalizeSessionTime } from "@/lib/utils"
import moment from "moment"
import type { Prisma } from "@prisma/client"

export type ChannelRoomDoctorSessionOption = {
  id: string
  startTime: Date
  endTime: Date
  channelCurrentPatientNumber: number
  roomNumber: string | null
  locationName: string | null
  isDoctorArrived: boolean
}

/**
 * Today's sessions for a doctor (for channel room picker). Includes arrival flag; UI can disable visit until arrived.
 */
export async function getChannelRoomDoctorSessionsService(
  doctorId: string,
  date: Date | string,
  locationId?: string | null
): Promise<{
  success: boolean
  data?: ChannelRoomDoctorSessionOption[]
  message?: string
}> {
  try {
    if (!doctorId?.trim()) {
      return { success: false, message: "Doctor is required." }
    }
    const dateObj = typeof date === "string" ? new Date(date) : date
    const dayStart = moment(dateObj).startOf("day").toDate()
    const dayEnd = moment(dateObj).endOf("day").toDate()

    const where: Prisma.SessionWhereInput = {
      doctorId: doctorId.trim(),
      date: { gte: dayStart, lte: dayEnd },
      status: { in: [0, 1] },
    }
    if (locationId?.trim()) {
      where.locationId = locationId.trim()
    }

    const records = await prisma.session.findMany({
      where,
      include: {
        room: { select: { number: true } },
        location: { select: { name: true } },
      },
      orderBy: [{ startTime: "asc" }],
    })

    const data: ChannelRoomDoctorSessionOption[] = records.map((r) => {
      const sessionDate = r.date instanceof Date ? r.date : new Date(r.date)
      const arrived = isSessionDoctorArrived({
        doctorArrivalTime: r.doctorArrivalTime,
        doctorDepatureTime: r.doctorDepatureTime,
      })
      return {
        id: r.id,
        startTime: normalizeSessionTime(r.startTime as Date | number, sessionDate),
        endTime: normalizeSessionTime(r.endTime as Date | number, sessionDate),
        channelCurrentPatientNumber: r.channelCurrentPatientNumber,
        roomNumber: r.room?.number ?? null,
        locationName: r.location?.name ?? null,
        isDoctorArrived: arrived,
      }
    })

    return { success: true, data }
  } catch (e) {
    console.error("getChannelRoomDoctorSessionsService", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to load sessions.",
    }
  }
}
