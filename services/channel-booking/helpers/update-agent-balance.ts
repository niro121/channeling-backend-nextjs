import prisma from "@/lib/prisma"

/**
 * Spec §6.7. Update agency balance (e.g. after creating receipt: balance += value; value is negative for payment).
 */
export async function updateAgentBalance(
  agencyId: string,
  value: number
): Promise<{ balance: number }> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { balance: true },
  })
  if (!agency) {
    throw new Error("Agency not found")
  }
  const newBalance = (agency.balance ?? 0) + value
  await prisma.agency.update({
    where: { id: agencyId },
    data: { balance: newBalance },
  })
  return { balance: newBalance }
}
