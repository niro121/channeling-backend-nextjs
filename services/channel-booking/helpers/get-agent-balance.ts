import prisma from "@/lib/prisma"

/**
 * Spec §6.6 (no to_date). Return current agency balance.
 */
export async function getAgentBalance(agencyId: string): Promise<number> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { balance: true },
  })
  return agency?.balance ?? 0
}
