"use server"

import prisma from "@/lib/prisma"

/** Minimal doctor option for channel-booking (id, title, name, specialityId, locationIds). */
export type ChannelBookingDoctorOption = {
  id: string
  title: string
  name: string
  specialityId: string | null
  /** Branches this doctor is tagged to. Empty = available at all branches. */
  locationIds: string[]
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
    const records = await prisma.doctor.findMany({
      where: { status: 1 },
      orderBy: { name: "asc" },
      select: {
        id: true,
        title: true,
        name: true,
        specialityId: true,
      },
    })

    const locationIdsByDoctor = new Map<string, string[]>()
    try {
      const links = await prisma.doctorLocation.findMany({
        select: { doctorId: true, locationId: true },
      })
      for (const link of links) {
        if (!link.doctorId || !link.locationId) continue
        const existing = locationIdsByDoctor.get(link.doctorId)
        if (existing) existing.push(link.locationId)
        else locationIdsByDoctor.set(link.doctorId, [link.locationId])
      }
    } catch (linkError: unknown) {
      // Relation/client may be stale after schema change; treat as untagged
      console.warn(
        "getDoctorsForChannelBookingService: doctorLocation lookup failed; treating doctors as untagged",
        linkError
      )
    }

    const data: ChannelBookingDoctorOption[] = records
      .filter((r) => r.id)
      .map((r) => ({
        id: r.id,
        title: r.title,
        name: r.name,
        specialityId: r.specialityId ?? null,
        locationIds: locationIdsByDoctor.get(r.id) ?? [],
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
