import prisma from "@/lib/prisma"

function pad(num: number, size: number): string {
  return String(num).padStart(size, "0")
}

/**
 * Location-based booking sequence and string format (matches legacy: shortcode + 'BOOK/' + pad(8)).
 * scopeKey: locationId + '-bookings'
 * When locationId is null, uses booking:global and "BOOK/" prefix.
 */
export async function getBookingSequenceInfo(
  locationId: string | null
): Promise<{ scopeKey: string; formatBookingIdString: (num: number) => string }> {
  if (!locationId) {
    return {
      scopeKey: "booking:global",
      formatBookingIdString: (num) => `BOOK/${pad(num, 8)}`,
    }
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { code: true },
  })
  const shortcode = location?.code ?? "LOC"
  const scopeKey = `${locationId}-bookings`
  return {
    scopeKey,
    formatBookingIdString: (num) => `${shortcode}BOOK/${pad(num, 8)}`,
  }
}
