import prisma from "@/lib/prisma"

export type GetNextSequenceResult =
  | { success: true; value: number }
  | { success: false; errorCode: "LIMIT_EXCEEDED" }

export type GetNextSequenceOptions = {
  /** First value to emit when sequence is new or below this (e.g. session.startingPatientNumber). */
  startFrom?: number
  /** If set, return LIMIT_EXCEEDED when next value would exceed this (e.g. session.maxPatientNumber). */
  max?: number
}

/**
 * Atomically reserve and return the next number for the given scope.
 * Use for appointment numbers (scope e.g. "appointment:sessionId"), receipt numbers, etc.
 * Creates the sequence row on first use.
 */
export async function getNextSequenceNumber(
  scopeKey: string,
  options?: GetNextSequenceOptions
): Promise<GetNextSequenceResult> {
  const startFrom = options?.startFrom ?? 0
  const max = options?.max

  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { scopeKey },
      create: { scopeKey, lastValue: startFrom - 1 },
      update: {},
    })

    const next =
      seq.lastValue < startFrom ? startFrom : seq.lastValue + 1

    if (max !== undefined && next > max) {
      return { success: false as const, errorCode: "LIMIT_EXCEEDED" as const }
    }

    await tx.sequence.update({
      where: { scopeKey },
      data: { lastValue: next },
    })

    return { success: true as const, value: next }
  })

  return result
}
