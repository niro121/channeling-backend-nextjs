"use server"

import prisma from "@/lib/prisma"

/** Minimal speciality option for channel-booking (id + name only). */
export type ChannelBookingSpecialityOption = { id: string; name: string }

/**
 * Get all specialities for channel-booking (e.g. speciality filter in doctor selection).
 * Returns published specialities only (status === 1), minimal fields (id, name), ordered by name.
 */
export async function getSpecialitiesForChannelBookingService(): Promise<{
  success: boolean
  data?: ChannelBookingSpecialityOption[]
  message?: string
  error?: { message?: string }
}> {
  try {
    const records = await prisma.speciality.findMany({
      where: { status: 1 },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })

    const data: ChannelBookingSpecialityOption[] = records
      .filter((r) => r.id)
      .map((r) => ({ id: r.id, name: r.name ?? "" }))

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getSpecialitiesForChannelBookingService error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch specialities"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
