import prisma from "@/lib/prisma"

export type ChannelBookingStaffOption = {
  id: string
  name: string
  code: string
}

const MAX_STAFF_OPTIONS = 500

/**
 * Get staff options for channel booking dropdown (e.g. Staff booking type).
 */
export async function getStaffOptionsForChannelBookingService(): Promise<{
  success: boolean
  data?: ChannelBookingStaffOption[]
  message?: string
}> {
  try {
    const records = await prisma.staff.findMany({
      where: { status: 1 },
      take: MAX_STAFF_OPTIONS,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    })
    const data: ChannelBookingStaffOption[] = records.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      code: r.code ?? "",
    }))
    return { success: true, data }
  } catch (error: unknown) {
    console.error("getStaffOptionsForChannelBookingService error", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch staff options",
    }
  }
}
