import prisma from '@/lib/prisma';

export type GetNextSequenceResult =
  | { success: true; value: number }
  | { success: false; errorCode: 'LIMIT_EXCEEDED' };

export type GetNextSequenceOptions = {
  /** First value to emit when the sequence is new or below this. */
  startFrom?: number;
  /** Return LIMIT_EXCEEDED when the next value would exceed this. */
  max?: number;
};

/**
 * Atomically reserve and return the next number for the given scope.
 * Creates the sequence row on first use. Safe under concurrent requests.
 */
export async function getNextSequenceNumber(
  scopeKey: string,
  options?: GetNextSequenceOptions
): Promise<GetNextSequenceResult> {
  const startFrom = options?.startFrom ?? 1;
  const max = options?.max;

  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { scopeKey },
      create: { scopeKey, lastValue: startFrom - 1 },
      update: {},
    });

    const next = seq.lastValue < startFrom ? startFrom : seq.lastValue + 1;

    if (max !== undefined && next > max) {
      return { success: false as const, errorCode: 'LIMIT_EXCEEDED' as const };
    }

    await tx.sequence.update({
      where: { scopeKey },
      data: { lastValue: next },
    });

    return { success: true as const, value: next };
  });

  return result;
}
