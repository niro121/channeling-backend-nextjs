import prisma from "@/lib/prisma"

export type AgencyBookForChannelBooking = {
  id: string
  bookNumber: string
  startNumber: string
  endNumber: string
}

export type AgencyDetailsForChannelBooking = {
  id: string
  name: string
  code: string | null
  creditLimit: number
  allowedCreditLimit: number
  maxCreditLimit: number
  balance: number
  books: AgencyBookForChannelBooking[]
}

export async function getAgencyDetailsForChannelBookingService(
  agencyId: string
): Promise<{
  success: boolean
  data?: AgencyDetailsForChannelBooking
  message?: string
}> {
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        name: true,
        code: true,
        creditLimit: true,
        allowedCreditLimit: true,
        maxCreditLimit: true,
        balance: true,
      },
    })
    if (!agency) {
      return { success: false, message: "Agency not found." }
    }

    const books = await prisma.agencyBook.findMany({
      where: { agencyId, status: 1 },
      orderBy: { bookNumber: "asc" },
      select: {
        id: true,
        bookNumber: true,
        startNumber: true,
        endNumber: true,
      },
    })

    const data: AgencyDetailsForChannelBooking = {
      id: agency.id,
      name: agency.name,
      code: agency.code ?? null,
      creditLimit: Number(agency.creditLimit),
      allowedCreditLimit: Number(agency.allowedCreditLimit),
      maxCreditLimit: Number(agency.maxCreditLimit),
      balance: Number(agency.balance),
      books: books.map((b) => ({
        id: b.id,
        bookNumber: b.bookNumber,
        startNumber: b.startNumber,
        endNumber: b.endNumber,
      })),
    }
    return { success: true, data }
  } catch (error: unknown) {
    console.error("getAgencyDetailsForChannelBookingService error", error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch agency details.",
    }
  }
}
