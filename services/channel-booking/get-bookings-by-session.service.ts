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
  agencyCode: string | null
  staffId: string | null
  staffCode: string | null
  /** Set when booking was transferred into this session (or from another). */
  movedAt: Date | null
  /** 0 = none, 1 = prof only, 2 = hosp only, 3 = full. Transfer tick hidden when !== 0. */
  refund: number
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
        agency: { select: { code: true } },
        staffId: true,
        staff: { select: { code: true } },
        movedAt: true,
        refund: true,
      },
    })

    type Row = {
      id: string
      appointmentNo: number
      title: string
      name: string
      status: number
      method: number
      agencyRef: string | null
      agency: { code: string | null } | null
      staffId: string | null
      staff: { code: string } | null
      movedAt: Date | null
      refund: number
    }
    const data: ChannelBookingListItem[] = (records as Row[]).map((r) => ({
      id: r.id,
      appointmentNo: r.appointmentNo,
      title: r.title,
      name: r.name,
      status: r.status,
      method: r.method,
      methodName: BOOKING_METHODS.find((m) => m.id === r.method)?.name ?? "",
      agencyRef: r.agencyRef,
      agencyCode: r.agency?.code ?? null,
      staffId: r.staffId,
      staffCode: r.staff?.code ?? null,
      movedAt: r.movedAt ?? null,
      refund: r.refund ?? 0,
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
