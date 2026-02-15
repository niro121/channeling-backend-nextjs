import prisma from "@/lib/prisma"
import { BOOKING_METHODS } from "@/types/channel-booking"

export type ChannelBookingListItem = {
  id: string
  appointmentNo: number
  title: string
  name: string
  status: number
  method: number
  methodName: string
  agencyRef: string | null
  staffId: string | null
}

/** Prisma client: booking model exists after schema add + `npx prisma generate`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaBooking = (prisma as any).booking

/**
 * Get all bookings for a session, ordered by appointmentNo descending. For display in the Bookings panel.
 */
export async function getBookingsBySessionService(
  sessionId: string
): Promise<{
  success: boolean
  data?: ChannelBookingListItem[]
  message?: string
  error?: { message?: string }
}> {
  try {
    if (!prismaBooking) {
      return { success: true, data: [] }
    }

    const records = await prismaBooking.findMany({
      where: { sessionId },
      orderBy: { appointmentNo: "desc" },
      select: {
        id: true,
        appointmentNo: true,
        title: true,
        name: true,
        status: true,
        method: true,
        agencyRef: true,
        staffId: true,
      },
    })

    type Row = { id: string; appointmentNo: number; title: string; name: string; status: number; method: number; agencyRef: string | null; staffId: string | null }
    const data: ChannelBookingListItem[] = (records as Row[]).map((r) => ({
      id: r.id,
      appointmentNo: r.appointmentNo,
      title: r.title,
      name: r.name,
      status: r.status,
      method: r.method,
      methodName: BOOKING_METHODS.find((m) => m.id === r.method)?.name ?? "",
      agencyRef: r.agencyRef,
      staffId: r.staffId,
    }))

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getBookingsBySessionService error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch bookings"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
