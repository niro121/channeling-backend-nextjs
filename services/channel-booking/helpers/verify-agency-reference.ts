import prisma from "@/lib/prisma"

export type VerifyAgencyReferenceResult =
  | { valid: true }
  | { valid: false; reason: string }

/**
 * Spec §6.5. Verify agency reference.
 * Ref must be >= 4 chars; last 2 chars = numeric leaf (e.g. "01", "02"); prefix = book number.
 */
export async function verifyAgencyReference(
  ref: string,
  agencyId: string
): Promise<boolean> {
  const result = await verifyAgencyReferenceWithReason(ref, agencyId)
  return !result.valid
}

/**
 * Same as verifyAgencyReference but returns a reason when invalid (for UI).
 */
export async function verifyAgencyReferenceWithReason(
  ref: string,
  agencyId: string
): Promise<VerifyAgencyReferenceResult> {
  const trimmedRef = (ref ?? "").trim()

  if (!trimmedRef || trimmedRef.length <= 3) {
    return {
      valid: false,
      reason: "REF must be at least 3 characters (e.g. book number + 2-digit leaf like 01).",
    }
  }

  const existing = await prisma.booking.findFirst({
    where: {
      agencyRef: trimmedRef,
      agencyId,
      status: { in: [0, 1] },
    },
  })
  if (existing) {
    return { valid: false, reason: "This REF is already used on another booking." }
  }

  const refbook = trimmedRef.substring(0, trimmedRef.length - 2)
  const leaf = trimmedRef.slice(-2)
  const leafNum = parseInt(leaf, 10)
  if (isNaN(leafNum) || leafNum <= 0) {
    return {
      valid: false,
      reason: "Last 2 characters of REF must be a number greater than 0 (e.g. 01, 02).",
    }
  }

  const agencyBook = await prisma.agencyBook.findFirst({
    where: {
      bookNumber: refbook,
      status: 1,
      agencyId,
    },
  })

  if (!agencyBook) {
    return {
      valid: false,
      reason: `No active book found for "${refbook}" for this agency. Check that the REF prefix matches an agency book number.`,
    }
  }

  return { valid: true }
}
