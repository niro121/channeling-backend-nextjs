"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import moment from "moment"
import type { Session } from "@/types/booking.dashboard"

/**
 * Fetches Session records (bookable sessions) for a doctor from a given date onward.
 * Returns that day and all future sessions for the doctor. Optionally filter by locationId.
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
      status: 1,
    }
    if (locationId) {
      where.locationId = locationId
    }

    const start = Date.now()
    const records = await prisma.session.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, title: true, name: true },
        },
        location: true,
        room: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })
    const ms = Date.now() - start
    if (process.env.NODE_ENV !== "test") {
      console.log(`[channel-booking] getSessionsForChannelBooking: ${ms}ms (${records.length} rows)`)
    }

    const data = records.map((r) => ({
      id: r.id,
      institution: r.institution,
      date: r.date,
      doctorSessionId: r.doctorSessionId,
      previousDoctorSession: r.previousDoctorSession,
      startTime: r.startTime,
      endTime: r.endTime,
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
      doctor: r.doctor ?? undefined,
      location: r.location ?? undefined,
      room: r.room ?? undefined,
    })) as Session[]

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
