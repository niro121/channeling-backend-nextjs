import prisma from "@/lib/prisma"
import { getAccountBalance } from "@/services/accounting/balance-calc.service"

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
  /** Soft limit for bookings (user-editable on agency). Hard limit is account minBalanceAllowed. */
  allowedCreditLimit: number
  /** Balance from linked PAYABLE account (rupees for display). */
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
        allowedCreditLimit: true,
        accounts: {
          where: { type: "PAYABLE", isActive: true },
          take: 1,
          select: { id: true },
        },
      },
    })
    if (!agency) {
      return { success: false, message: "Agency not found." }
    }

    const account = agency.accounts?.[0]
    const balanceCents = account ? await getAccountBalance(account.id) : 0
    const balanceRupees = balanceCents / 100

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
      allowedCreditLimit: Number(agency.allowedCreditLimit),
      balance: balanceRupees,
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
