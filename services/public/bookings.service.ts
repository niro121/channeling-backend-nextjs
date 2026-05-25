import prisma from "@/lib/prisma"
import moment from "moment"

const BOOKING_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Paid",
  2: "Cancel",
  3: "Refund",
}

/** Public API patient fields only (no payment or desk ops). */
export type PublicBookingPatientDto = {
  title: string
  name: string
  sex: string
  phone: string
  area: string
  remarks: string
  foreigner: boolean
}

export type PublicBookingDto = {
  id: string
  appointmentNo: number
  status: number
  statusLabel: string
  patient: PublicBookingPatientDto
  session: {
    id: string
    date: string
    startTimeFormatted: string
    location: { id: string; name: string } | null
  }
}

export type GetPublicBookingsParams = {
  doctorCode: string
  sessionId?: string | null
  date?: string | null
  includePending?: boolean
}

export type GetPublicBookingsResult =
  | { success: true; data: PublicBookingDto[] }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

function mapBookingRow(row: {
  id: string
  appointmentNo: number
  title: string
  name: string
  sex: string
  phone: string
  area: string
  remarks: string
  foriegner: boolean
  status: number
  session: {
    id: string
    date: Date
    startTime: Date
    location: { id: string; name: string } | null
  } | null
}): PublicBookingDto | null {
  if (!row.session) return null
  const sessionDate =
    row.session.date instanceof Date ? row.session.date : new Date(row.session.date)
  return {
    id: row.id,
    appointmentNo: row.appointmentNo,
    status: row.status,
    statusLabel: BOOKING_STATUS_LABELS[row.status] ?? String(row.status),
    patient: {
      title: row.title,
      name: row.name,
      sex: row.sex,
      phone: row.phone,
      area: row.area,
      remarks: row.remarks,
      foreigner: row.foriegner,
    },
    session: {
      id: row.session.id,
      date: moment(sessionDate).format("YYYY-MM-DD"),
      startTimeFormatted: moment(row.session.startTime).format("h:mm A"),
      location: row.session.location
        ? { id: row.session.location.id, name: row.session.location.name }
        : null,
    },
  }
}

/**
 * Get paid bookings for public API by doctor code, scoped by sessionId or date.
 */
export async function getPublicBookingsByDoctorCode(
  params: GetPublicBookingsParams
): Promise<GetPublicBookingsResult> {
  const doctorCode = params.doctorCode?.trim()
  const sessionId = params.sessionId?.trim() || null
  const dateParam = params.date?.trim() || null

  if (!doctorCode) {
    return {
      success: false,
      code: "invalid_request",
      message: "doctorCode is required",
    }
  }

  if (!sessionId && !dateParam) {
    return {
      success: false,
      code: "invalid_request",
      message: "sessionId or date is required",
    }
  }

  if (dateParam && !moment(dateParam, "YYYY-MM-DD", true).isValid()) {
    return {
      success: false,
      code: "invalid_request",
      message: "date must be YYYY-MM-DD",
    }
  }

  const doctor = await prisma.doctor.findUnique({
    where: { code: doctorCode },
    select: { id: true },
  })

  if (!doctor) {
    return {
      success: false,
      code: "not_found",
      message: "Doctor not found for the given doctor code",
    }
  }

  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, doctorId: true },
    })
    if (!session) {
      return {
        success: false,
        code: "not_found",
        message: "Session not found",
      }
    }
    if (session.doctorId !== doctor.id) {
      return {
        success: false,
        code: "not_found",
        message: "Session does not belong to this doctor",
      }
    }
  }

  const statuses = params.includePending ? [0, 1] : [1]

  const dateStart = dateParam
    ? moment(dateParam, "YYYY-MM-DD", true).startOf("day").toDate()
    : null
  const dateEnd = dateParam
    ? moment(dateParam, "YYYY-MM-DD", true).endOf("day").toDate()
    : null

  try {
    const records = await prisma.booking.findMany({
      where: {
        doctorId: doctor.id,
        status: { in: statuses },
        ...(sessionId
          ? { sessionId }
          : dateStart && dateEnd
            ? {
                session: {
                  date: { gte: dateStart, lte: dateEnd },
                },
              }
            : {}),
      },
      orderBy: [
        { session: { startTime: "asc" } },
        { appointmentNo: "asc" },
      ],
      select: {
        id: true,
        appointmentNo: true,
        title: true,
        name: true,
        sex: true,
        phone: true,
        area: true,
        remarks: true,
        foriegner: true,
        status: true,
        session: {
          select: {
            id: true,
            date: true,
            startTime: true,
            location: { select: { id: true, name: true } },
          },
        },
      },
    })

    const bookings = records
      .map((r) => mapBookingRow(r))
      .filter((b): b is PublicBookingDto => b !== null)

    return { success: true, data: bookings }
  } catch (error) {
    console.error("getPublicBookingsByDoctorCode error", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch bookings",
    }
  }
}
