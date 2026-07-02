import prisma from "@/lib/prisma"

/** Result type for channel-booking area options (tag cities: id + name). */
export type ChannelBookingAreaOption = { id: string; name: string }

const TAG_TYPE_AREA = 0 // City (old system type 0)
const TAG_STATUS_ACTIVE = 1

/**
 * Get all areas for channel-booking (e.g. Area dropdown in booking form).
 * Returns active tags with type = Area (tag cities), minimal payload, ordered by name.
 */
export async function getAreasForChannelBookingService(): Promise<{
  success: boolean
  data?: ChannelBookingAreaOption[]
  message?: string
  error?: { message?: string }
}> {
  try {
    const records = await prisma.tag.findMany({
      where: {
        status: TAG_STATUS_ACTIVE,
        type: TAG_TYPE_AREA,
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })

    const data: ChannelBookingAreaOption[] = records
      .filter((r) => r.id)
      .map((r) => ({ id: r.id, name: r.name ?? "" }))

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getAreasForChannelBookingService error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch areas"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
