import prisma from "@/lib/prisma"
import { getAccountBalance } from "@/services/accounting/balance-calc.service"

/**
 * Spec §6.6 (no to_date). Return current agency balance in cents.
 * Uses linked PAYABLE account balance; returns 0 when no linked account.
 */
export async function getAgentBalance(agencyId: string): Promise<number> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      accounts: {
        where: { type: "PAYABLE", isActive: true },
        take: 1,
        select: { id: true },
      },
    },
  })
  if (!agency) return 0
  const account = agency.accounts?.[0]
  if (account) {
    return await getAccountBalance(account.id)
  }
  return 0
}
