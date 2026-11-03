import prisma from "@/lib/prisma"

/**
 * Location used for channel payment/refund receipts (bill prefix, branch income, cash book).
 * Prefer the cashier's assigned location (where payment is collected), not the session location.
 * Falls back to session/booking location when the user has no location set.
 */
export async function resolveReceiptLocationId(
  userId: string | null | undefined,
  fallbackLocationId: string | null
): Promise<string | null> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userLocationId: true },
    })
    if (user?.userLocationId) return user.userLocationId
  }
  return fallbackLocationId
}
