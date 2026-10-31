import prisma from '@/lib/prisma';

export type GetNextSequenceResult =
  | { success: true; value: number }
  | { success: false; errorCode: 'LIMIT_EXCEEDED' };

/**
 * Atomically reserves the next sequence value for a scope.
 * Uses upsert + $inc so concurrent callers never receive the same number.
 */
export async function getNextSequenceNumber(
  scopeKey: string,
  options?: { startFrom?: number; max?: number }
): Promise<GetNextSequenceResult> {
  const startFrom = options?.startFrom ?? 1;
  const max = options?.max;

  // Ensure the counter document exists. Unique scopeKey makes concurrent creates safe.
  await prisma.sequence.upsert({
    where: { scopeKey },
    create: { scopeKey, lastValue: startFrom - 1 },
    update: {},
  });

  const updated = await prisma.sequence.update({
    where: { scopeKey },
    data: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });

  if (max !== undefined && updated.lastValue > max) {
    return { success: false, errorCode: 'LIMIT_EXCEEDED' };
  }

  return { success: true, value: updated.lastValue };
}

/** Prisma / MongoDB unique constraint violation. */
export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  if (code === 'P2002') return true;
  const message = error instanceof Error ? error.message : String(error);
  return /unique constraint|E11000 duplicate key/i.test(message);
}
