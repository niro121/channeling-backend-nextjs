"use server"

import prisma from "@/lib/prisma"
import { normalizeSessionTime } from "@/lib/utils"
import { Prisma } from "@prisma/client"
import moment from "moment"
import type { Session } from "@/types/booking.dashboard"

/**
 * Fetches Session records (bookable sessions) for a doctor from a given date onward.
 * Returns that day and all future sessions for the doctor. Optionally filter by locationId.
 * Optimized: single session query (no booking rows), then one groupBy for counts.
 */
export async function getSessionsForChannelBookingService(
  doctorId: string,
  date: Date | string,
  locationId?: string | null
): Promise<{
  success: boolean
  data?: Session[]
  message?: string
  error?: { message?: string }
}> {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    const fromDate = moment(dateObj).startOf("day").toDate()

    const where: Prisma.SessionWhereInput = {
      doctorId,
      date: { gte: fromDate },
      status: { in: [0, 1] }, // 1 = ACTIVE, 0 = doctor on leave
    }
    if (locationId) {
      where.locationId = locationId
    }

    // Run both queries in parallel (counts include both active and on-leave sessions)
    const [records, countRows] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          doctor: { select: { id: true, title: true, name: true } },
          location: { select: { id: true, name: true } },
          room: { select: { id: true, number: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.booking.groupBy({
        by: ["sessionId", "status"],
        where: {
          session: {
            doctorId,
            date: { gte: fromDate },
            status: { in: [0, 1] },
            ...(locationId ? { locationId } : {}),
          },
          status: { in: [0, 1] },
        },
        _count: { id: true },
      }),
    ])

    if (records.length === 0) return { success: true, data: [] }

    const countBySession = new Map<string, { paid: number; pending: number }>()
    for (const r of records) {
      countBySession.set(r.id, { paid: 0, pending: 0 })
    }
    for (const row of countRows) {
      if (row.sessionId == null) continue
      const cur = countBySession.get(row.sessionId)
      if (!cur) continue
      if (row.status === 1) cur.paid = row._count.id
      else if (row.status === 0) cur.pending = row._count.id
    }

    const toSessionDate = (r: (typeof records)[0]) => r.date instanceof Date ? r.date : new Date(r.date)
    const data = records.map((r) => {
      const counts = countBySession.get(r.id) ?? { paid: 0, pending: 0 }
      return {
        id: r.id,
        institution: r.institution,
        date: r.date,
        doctorSessionId: r.doctorSessionId,
        previousDoctorSession: r.previousDoctorSession,
        startTime: normalizeSessionTime(r.startTime as Date | number, toSessionDate(r)),
        endTime: normalizeSessionTime(r.endTime as Date | number, toSessionDate(r)),
        durationMinutes: r.durationMinutes,
        startingPatientNumber: r.startingPatientNumber,
        maxPatientNumber: r.maxPatientNumber,
        refundable: r.refundable,
        fees: r.fees,
        amountLocal: r.amountLocal,
        amountForeign: r.amountForeign,
        status: r.status,
        doctorLeaveRemark: r.doctorLeaveRemark ?? null,
        doctorLeaveCreator: r.doctorLeaveCreator ?? null,
        doctorLeaveCreatedAt: r.doctorLeaveCreatedAt ?? null,
        remarks: r.remarks,
        appointmentNo: r.appointmentNo,
        isScan: r.isScan,
        doctorId: r.doctorId,
        departmentId: r.departmentId,
        locationId: r.locationId,
        roomId: r.roomId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        doctor: r.doctor ?? undefined,
        location: r.location ?? undefined,
        room: r.room ?? undefined,
        paidCount: counts.paid,
        pendingCount: counts.pending,
      }
    }) as Session[]

    // Ensure ascending order by date, then by start time
    data.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime()
      const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()
      if (dateA !== dateB) return dateA - dateB
      const timeA = a.startTime instanceof Date ? a.startTime.getTime() : 0
      const timeB = b.startTime instanceof Date ? b.startTime.getTime() : 0
      return timeA - timeB
    })

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getSessionsForChannelBookingService error", error)
    const message = error instanceof Error ? error.message : "Failed to fetch sessions"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}

/**
 * Fetch a single session by id for channel booking (e.g. when selecting a booking from search).
 * Returns same Session shape as getSessionsForChannelBookingService.
 */
export async function getSessionByIdForChannelBookingService(
  sessionId: string
): Promise<{
  success: boolean
  data?: Session | null
  message?: string
  error?: { message?: string }
}> {
  try {
    const [record, countRows] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          doctor: { select: { id: true, title: true, name: true } },
          location: { select: { id: true, name: true } },
          room: { select: { id: true, number: true } },
        },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { sessionId },
        _count: { id: true },
      }),
    ])
    if (!record) return { success: true, data: null }

    let paid = 0,
      pending = 0
    for (const row of countRows) {
      if (row.status === 1) paid = row._count.id
      else if (row.status === 0) pending = row._count.id
    }
    const sessionDate = record.date instanceof Date ? record.date : new Date(record.date)
    const session: Session = {
      id: record.id,
      institution: record.institution,
      date: record.date,
      doctorSessionId: record.doctorSessionId,
      previousDoctorSession: record.previousDoctorSession,
      startTime: normalizeSessionTime(record.startTime as Date | number, sessionDate),
      endTime: normalizeSessionTime(record.endTime as Date | number, sessionDate),
      durationMinutes: record.durationMinutes,
      startingPatientNumber: record.startingPatientNumber,
      maxPatientNumber: record.maxPatientNumber,
      refundable: record.refundable,
      fees: record.fees,
      amountLocal: record.amountLocal,
      amountForeign: record.amountForeign,
      status: record.status,
      doctorLeaveRemark: record.doctorLeaveRemark ?? null,
      doctorLeaveCreator: record.doctorLeaveCreator ?? null,
      doctorLeaveCreatedAt: record.doctorLeaveCreatedAt ?? null,
      remarks: record.remarks,
      appointmentNo: record.appointmentNo,
      isScan: record.isScan,
      doctorId: record.doctorId,
      departmentId: record.departmentId,
      locationId: record.locationId,
      roomId: record.roomId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      doctor: record.doctor ?? undefined,
      location: record.location ?? undefined,
      room: record.room ?? undefined,
      paidCount: paid,
      pendingCount: pending,
    }
    return { success: true, data: session }
  } catch (error: unknown) {
    console.error("getSessionByIdForChannelBookingService error", error)
    const message = error instanceof Error ? error.message : "Failed to fetch session"
    return { success: false, message, error: { message } }
  }
}
