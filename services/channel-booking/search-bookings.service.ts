"use server"

import prisma from "@/lib/prisma"
import { BOOKING_METHODS } from "@/types/channel-booking"
import { Prisma } from "@prisma/client"
import moment from "moment"

const MAX_SEARCH_RESULTS = 50

export type SearchBookingsParams = {
  /** Search by name, mobile, agent ref, bill no (receiptNoString | bookingid_string). */
  keyword?: string | null
  fromDate?: Date | string | null
  toDate?: Date | string | null
}

export type SearchBookingsResultItem = {
  id: string
  appointmentNo: number
  title: string
  name: string
  phone: string
  status: number
  method: number
  methodName: string
  agencyRef: string | null
  agencyName: string | null
  staffId: string | null
  staffName: string | null
  receiptNoString: string | null
  bookingid_string: string | null
  sessionId: string | null
  sessionDate: Date | null
  doctorName: string | null
}

export type SearchBookingsResult = {
  success: boolean
  data?: SearchBookingsResultItem[]
  truncated?: boolean
  message?: string
  error?: { message?: string }
}

/**
 * Search bookings by keyword (name, phone, agencyRef, receiptNoString, bookingid_string)
 * and optional date range (session date). Returns at most MAX_SEARCH_RESULTS (50);
 * if more match, truncated is true and client should show "Narrow the search".
 */
export async function searchBookingsService(
  params: SearchBookingsParams
): Promise<SearchBookingsResult> {
  try {
    const keyword = params.keyword?.trim() || null
    const fromDate = params.fromDate
      ? moment(params.fromDate).startOf("day").toDate()
      : null
    const toDate = params.toDate
      ? moment(params.toDate).endOf("day").toDate()
      : null

    if (!keyword && !fromDate && !toDate) {
      return { success: true, data: [] }
    }

    const where: Prisma.BookingWhereInput = {}

    if (keyword) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const insensitive = { contains: escaped, mode: "insensitive" as const }
      where.OR = [
        { name: insensitive },
        { phone: { contains: keyword } },
        { agencyRef: insensitive },
        { receiptNoString: { contains: keyword } },
        { bookingid_string: { contains: keyword } },
      ]
    }

    if (fromDate || toDate) {
      where.session = {
        date: {
          ...(fromDate && { gte: fromDate }),
          ...(toDate && { lte: toDate }),
        },
      }
    }

    const records = await prisma.booking.findMany({
      where,
      take: MAX_SEARCH_RESULTS + 1,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        appointmentNo: true,
        title: true,
        name: true,
        phone: true,
        status: true,
        method: true,
        agencyRef: true,
        staffId: true,
        receiptNoString: true,
        bookingid_string: true,
        sessionId: true,
        session: { select: { date: true } },
        doctor: { select: { title: true, name: true } },
        agency: { select: { name: true } },
        staff: { select: { name: true } },
      },
    })

    const truncated = records.length > MAX_SEARCH_RESULTS
    const list = (truncated ? records.slice(0, MAX_SEARCH_RESULTS) : records) as Array<{
      id: string
      appointmentNo: number
      title: string
      name: string
      phone: string
      status: number
      method: number
      agencyRef: string | null
      staffId: string | null
      receiptNoString: string | null
      bookingid_string: string | null
      sessionId: string | null
      session: { date: Date } | null
      doctor: { title: string; name: string } | null
      agency: { name: string } | null
      staff: { name: string } | null
    }>

    const data: SearchBookingsResultItem[] = list.map((r) => ({
      id: r.id,
      appointmentNo: r.appointmentNo,
      title: r.title,
      name: r.name,
      phone: r.phone,
      status: r.status,
      method: r.method,
      methodName: BOOKING_METHODS.find((m) => m.id === r.method)?.name ?? "",
      agencyRef: r.agencyRef,
      agencyName: r.agency?.name ?? null,
      staffId: r.staffId ?? null,
      staffName: r.staff?.name ?? null,
      receiptNoString: r.receiptNoString ?? null,
      bookingid_string: r.bookingid_string ?? null,
      sessionId: r.sessionId ?? null,
      sessionDate: r.session?.date ?? null,
      doctorName: r.doctor ? [r.doctor.title, r.doctor.name].filter(Boolean).join(" ") : null,
    }))

    return { success: true, data, truncated: truncated || undefined }
  } catch (error: unknown) {
    console.error("searchBookingsService error", error)
    const message =
      error instanceof Error ? error.message : "Failed to search bookings"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
