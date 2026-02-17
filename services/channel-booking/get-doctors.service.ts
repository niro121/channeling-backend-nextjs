"use server"

import prisma from "@/lib/prisma"

/** Minimal doctor option for channel-booking (id, title, name, specialityId only). */
export type ChannelBookingDoctorOption = {
  id: string
  title: string
  name: string
  specialityId: string
}

/**
 * Get all doctors for channel-booking (e.g. doctor selection dropdown).
 * Returns published doctors only (status === 1), minimal fields. No pagination; intended for in-memory filter in UI.
 */
export async function getDoctorsForChannelBookingService(): Promise<{
  success: boolean
  data?: ChannelBookingDoctorOption[]
  message?: string
  error?: { message?: string }
}> {
  try {
    const start = Date.now()
    const records = await prisma.doctor.findMany({
      where: { status: 1 },
      orderBy: { name: "asc" },
      select: { id: true, title: true, name: true, specialityId: true },
    })
    const ms = Date.now() - start
    if (process.env.NODE_ENV !== "test") {
      console.log(`[channel-booking] getDoctorsForChannelBooking: ${ms}ms (${records.length} rows)`)
    }

    const data: ChannelBookingDoctorOption[] = records
      .filter((r) => r.id)
      .map((r) => ({
        id: r.id,
        title: r.title,
        name: r.name,
        specialityId: r.specialityId,
      }))

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getDoctorsForChannelBookingService error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch doctors"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
