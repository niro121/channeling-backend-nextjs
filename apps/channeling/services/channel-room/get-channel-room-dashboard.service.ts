"use server"

import prisma from "@/lib/prisma"
import { normalizeSessionTime } from "@/lib/utils"
import moment from "moment"

export type ChannelRoomDashboardRow = {
  sessionId: string
  roomId: string
  institution: number
  locationId: string | null
  startTime: Date
  endTime: Date
  channelCurrentPatientNumber: number
  doctorName: string
  roomNumber: string | null
  locationName: string | null
  shownCount: number
  noShowCount: number
  waitingCount: number
}

/**
 * Today's active rooms for the channel room dashboard (paid queue stats).
 * Source of truth is Room.currentOccupiedSessionId lock.
 */
export type ChannelRoomSocketScopes = {
  institutionIds: number[]
  locationIds: string[]
}

export async function getChannelRoomDashboardService(params: {
  date?: Date | string
  locationId?: string | null
}): Promise<{
  success: boolean
  data?: ChannelRoomDashboardRow[]
  socketScopes?: ChannelRoomSocketScopes
  message?: string
}> {
  try {
    const dateObj = params.date ? (typeof params.date === "string" ? new Date(params.date) : params.date) : new Date()
    const dayStart = moment(dateObj).startOf("day").toDate()
    const dayEnd = moment(dateObj).endOf("day").toDate()

    const rooms = await prisma.room.findMany({
      where: {
        status: 1,
        ...(params.locationId?.trim() ? { locationId: params.locationId.trim() } : {}),
        currentOccupiedSessionId: { not: null },
      },
      include: {
        location: { select: { name: true } },
      },
      orderBy: [{ number: "asc" }],
    })

    const occupiedSessionIds = [
      ...new Set(
        rooms
          .map((r) => r.currentOccupiedSessionId)
          .filter((id): id is string => Boolean(id && String(id).trim()))
      ),
    ]

    const socketScopes: ChannelRoomSocketScopes = {
      institutionIds: [],
      locationIds: [
        ...new Set(
          rooms.map((r) => r.locationId).filter((id): id is string => Boolean(id && String(id).trim()))
        ),
      ],
    }

    if (occupiedSessionIds.length === 0) {
      return { success: true, data: [], socketScopes }
    }

    const occupiedSessions = await prisma.session.findMany({
      where: {
        id: { in: occupiedSessionIds },
        date: { gte: dayStart, lte: dayEnd },
        status: 1,
      },
      include: {
        doctor: { select: { title: true, name: true } },
      },
    })
    if (occupiedSessions.length === 0) {
      return { success: true, data: [], socketScopes }
    }

    socketScopes.institutionIds = [...new Set(occupiedSessions.map((r) => r.institution))]

    const sessionById = new Map(occupiedSessions.map((s) => [s.id, s]))
    const sessionIds = occupiedSessions.map((r) => r.id)
    const bookingRows = await prisma.booking.findMany({
      where: { sessionId: { in: sessionIds }, status: 1 },
      select: { sessionId: true, channelRoomAttendance: true },
    })

    const stats = new Map<string, { shown: number; noShow: number; waiting: number }>()
    for (const id of sessionIds) {
      stats.set(id, { shown: 0, noShow: 0, waiting: 0 })
    }
    for (const row of bookingRows) {
      if (!row.sessionId) continue
      const s = stats.get(row.sessionId)
      if (!s) continue
      if (row.channelRoomAttendance === 1) s.shown += 1
      else if (row.channelRoomAttendance === 2) s.noShow += 1
      else s.waiting += 1
    }

    const data: ChannelRoomDashboardRow[] = rooms.flatMap((room) => {
      const occupiedSessionId = room.currentOccupiedSessionId
      if (!occupiedSessionId) return []
      const r = sessionById.get(occupiedSessionId)
      if (!r) return []
      const sessionDate = r.date instanceof Date ? r.date : new Date(r.date)
      const st = stats.get(r.id) ?? { shown: 0, noShow: 0, waiting: 0 }
      const doctorName = [r.doctor?.title, r.doctor?.name].filter(Boolean).join(" ").trim() || "—"
      return [{
        sessionId: r.id,
        roomId: room.id,
        institution: r.institution,
        locationId: room.locationId ?? null,
        startTime: normalizeSessionTime(r.startTime as Date | number, sessionDate),
        endTime: normalizeSessionTime(r.endTime as Date | number, sessionDate),
        channelCurrentPatientNumber: r.channelCurrentPatientNumber,
        doctorName,
        roomNumber: room.number ?? null,
        locationName: room.location?.name ?? null,
        shownCount: st.shown,
        noShowCount: st.noShow,
        waitingCount: st.waiting,
      }]
    })

    data.sort((a, b) => {
      const ra = (a.roomNumber ?? "\uffff").localeCompare(b.roomNumber ?? "\uffff", undefined, { numeric: true })
      if (ra !== 0) return ra
      return a.startTime.getTime() - b.startTime.getTime()
    })

    return { success: true, data, socketScopes }
  } catch (e) {
    console.error("getChannelRoomDashboardService", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to load channel room dashboard.",
    }
  }
}
