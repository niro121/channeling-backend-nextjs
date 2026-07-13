import prisma from '@/lib/prisma';

export type GetNextSequenceResult =
  | { success: true; value: number }
  | { success: false; errorCode: 'LIMIT_EXCEEDED' };

export async function getNextSequenceNumber(
  scopeKey: string,
  options?: { startFrom?: number; max?: number }
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
