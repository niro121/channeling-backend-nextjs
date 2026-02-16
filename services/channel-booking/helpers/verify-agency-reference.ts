import prisma from "@/lib/prisma"

/**
 * Spec §6.5. Verify agency reference. Return true = error (invalid or duplicate).
 */
export async function verifyAgencyReference(
  ref: string,
  agencyId: string
): Promise<boolean> {
  if (!ref || ref.length <= 4) {
    return true
  }

  const existing = await prisma.booking.findFirst({
    where: {
      agencyRef: ref,
      agencyId,
      status: { in: [0, 1] },
    },
  })
  if (existing) {
    return true
  }

  const refbook = ref.substring(0, ref.length - 2)
  const leaf = ref.slice(-2)
  const leafNum = parseInt(leaf, 10)
  if (isNaN(leafNum) || leafNum <= 0) {
    return true
  }

  const agencyBook = await prisma.agencyBook.findFirst({
    where: {
      bookNumber: refbook,
      status: 1,
      agencyId,
    },
  })

  return !agencyBook
}
