import prisma from "@/lib/prisma"

export type ChannelBookingBankOption = { id: string; name: string }

const TAG_TYPE_BANK = 2
const TAG_STATUS_ACTIVE = 1

/**
 * Get all banks for channel-booking (e.g. Bank dropdown in settle form).
 */
export async function getBanksForChannelBookingService(): Promise<{
  success: boolean
  data?: ChannelBookingBankOption[]
  message?: string
}> {
  try {
    const records = await prisma.tag.findMany({
      where: { status: TAG_STATUS_ACTIVE, type: TAG_TYPE_BANK },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })
    const data: ChannelBookingBankOption[] = records
      .filter((r) => r.id)
      .map((r) => ({ id: r.id, name: r.name ?? "" }))
    return { success: true, data }
  } catch (error: unknown) {
    console.error("getBanksForChannelBookingService error", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch banks",
    }
  }
}
