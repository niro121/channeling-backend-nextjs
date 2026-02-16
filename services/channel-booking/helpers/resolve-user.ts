import prisma from "@/lib/prisma"

/**
 * Spec §6.11. Return display name for user id.
 */
export async function resolveUser(userId: string | null | undefined): Promise<string> {
  if (!userId) return "NO USER NAME"
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })
  return user?.name ?? "NO USER FOUND!"
}
