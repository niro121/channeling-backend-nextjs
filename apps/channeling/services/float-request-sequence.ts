import prisma from "@/lib/prisma"
import { getNextSequenceNumber } from "@/services/channel-booking/helpers/sequence"

function pad(num: number, size: number): string {
  return String(num).padStart(size, "0")
}

/**
 * Location-based float request sequence, same idea as cash-in (RHCSIN) and receipts.
 * Format: {locationCode}FLT/00001
 */
export async function getFloatSequenceInfo(locationId: string | null | undefined): Promise<{
  scopeKey: string
  formatFloatNoString: (num: number) => string
}> {
  if (!locationId) {
    return {
      scopeKey: "float:global",
      formatFloatNoString: (num) => `FLT/${pad(num, 5)}`,
    }
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { code: true },
  })
  const shortcode = location?.code ?? "LOC"
  return {
    scopeKey: `${locationId}-float`,
    formatFloatNoString: (num) => `${shortcode}FLT/${pad(num, 5)}`,
  }
}

export async function allocateFloatDocumentNumber(
  locationId: string | null | undefined
): Promise<{ floatNo: number; floatNoString: string } | null> {
  const { scopeKey, formatFloatNoString } = await getFloatSequenceInfo(locationId)
  const seq = await getNextSequenceNumber(scopeKey, { startFrom: 1 })
  if (!seq.success) return null
  return {
    floatNo: seq.value,
    floatNoString: formatFloatNoString(seq.value),
  }
}

export async function ensureFloatDocumentNumber(
  floatRequestId: string,
  locationId: string | null | undefined
): Promise<string | null> {
  try {
    const existing = await prisma.floatRequest.findUnique({
      where: { id: floatRequestId },
      select: { floatNoString: true },
    })
    const current = (existing as { floatNoString?: string | null } | null)?.floatNoString
    if (current) return current

    const allocated = await allocateFloatDocumentNumber(locationId)
    if (!allocated) return null

    await prisma.floatRequest.update({
      where: { id: floatRequestId },
      data: {
        floatNo: allocated.floatNo,
        floatNoString: allocated.floatNoString,
      } as never,
    })
    return allocated.floatNoString
  } catch (error) {
    console.error("[ensureFloatDocumentNumber]", error)
    return null
  }
}
