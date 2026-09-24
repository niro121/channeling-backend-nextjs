"use server"

import prisma from "@/lib/prisma"

/** Result type for channel-booking location options (id + name + order + color). */
export type ChannelBookingLocationOption = {
  id: string
  name: string
  order: number
  color: string | null
}

/**
 * Get all locations for channel-booking (e.g. branch dropdown).
 * Returns published locations only, ordered by list order then name.
 */
export async function getLocationsForChannelBookingService(): Promise<{
  success: boolean
  data?: ChannelBookingLocationOption[]
  message?: string
  error?: { message?: string }
}> {
  try {
    const records = await prisma.location.findMany({
      where: { status: 1 },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, order: true, color: true },
    })

    const data: ChannelBookingLocationOption[] = records
      .filter((r) => r.id)
      .map((r) => ({
        id: r.id,
        name: r.name ?? "Unknown",
        order: r.order ?? 0,
        color: r.color ?? null,
      }))

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getLocationsForChannelBookingService error", error)
    const message = error instanceof Error ? error.message : "Failed to fetch locations"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
