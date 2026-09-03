import prisma from "@/lib/prisma"
import { getNextSequenceNumber } from "@/services/channel-booking/helpers/sequence"

function pad(num: number, size: number): string {
  return String(num).padStart(size, "0")
}

/**
 * Location-based cash-in (handover) sequence, matching the old RHCSIN/##### documents.
 * Scope is per location so each branch numbers independently.
 */
export async function getHandoverSequenceInfo(locationId: string | null | undefined): Promise<{
  scopeKey: string
  formatHandoverNoString: (num: number) => string
}> {
  if (!locationId) {
    return {
      scopeKey: "handover:global",
      formatHandoverNoString: (num) => `CSIN/${pad(num, 5)}`,
    }
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { code: true },
  })
  const shortcode = location?.code ?? "LOC"
  return {
    scopeKey: `${locationId}-cashin`,
    formatHandoverNoString: (num) => `${shortcode}CSIN/${pad(num, 5)}`,
  }
}

export async function allocateHandoverDocumentNumber(
  locationId: string | null | undefined
): Promise<{ handoverNo: number; handoverNoString: string } | null> {
  const { scopeKey, formatHandoverNoString } = await getHandoverSequenceInfo(locationId)
  const seq = await getNextSequenceNumber(scopeKey, { startFrom: 1 })
  if (!seq.success) return null
  return {
    handoverNo: seq.value,
    handoverNoString: formatHandoverNoString(seq.value),
  }
}

/** Assign a document number if this handover was created before the sequence existed. */
export async function ensureHandoverDocumentNumber(
  handoverId: string,
  locationId: string | null | undefined
): Promise<string | null> {
  try {
    const existing = await prisma.shiftHandover.findUnique({
      where: { id: handoverId },
      select: { handoverNoString: true },
    })
    if (existing?.handoverNoString) return existing.handoverNoString

    const allocated = await allocateHandoverDocumentNumber(locationId)
    if (!allocated) return null

    await prisma.shiftHandover.update({
      where: { id: handoverId },
      data: {
        handoverNo: allocated.handoverNo,
        handoverNoString: allocated.handoverNoString,
      },
    })
    return allocated.handoverNoString
  } catch (error) {
    console.error("[ensureHandoverDocumentNumber]", error)
    return null
  }
}
