import prisma from "@/lib/prisma"

export type ChannelBookingAgencyBookOption = {
  id: string
  bookNumber: string
  startNumber: string
  endNumber: string
}

/**
 * Get agency books for an agency (status 1) for channel booking Agent flow.
 */
export async function getAgencyBooksByAgencyForChannelBookingService(
  agencyId: string
): Promise<{
  success: boolean
  data?: ChannelBookingAgencyBookOption[]
  message?: string
}> {
  try {
    const records = await prisma.agencyBook.findMany({
      where: { agencyId, status: 1 },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookNumber: true,
        startNumber: true,
        endNumber: true,
      },
    })
    const data: ChannelBookingAgencyBookOption[] = records.map((r) => ({
      id: r.id,
      bookNumber: r.bookNumber,
      startNumber: r.startNumber,
      endNumber: r.endNumber,
    }))
    return { success: true, data }
  } catch (error: unknown) {
    console.error("getAgencyBooksByAgencyForChannelBookingService error", error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch agency books",
    }
  }
}
