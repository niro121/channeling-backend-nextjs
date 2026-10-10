import prisma from '@/lib/prisma';

/**
 * Bump User.sessionVersion on successful login so any older JWTs become invalid
 * (single active session per user).
 *
 * Uses set (not increment) so users whose Mongo docs never had sessionVersion
 * still update cleanly (Prisma cannot increment null).
 */
export async function bumpSessionVersion(userId: string): Promise<number> {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  const next = (current?.sessionVersion ?? 0) + 1;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: next },
    select: { sessionVersion: true },
  });
  return updated.sessionVersion;
}

export async function getUserSessionVersion(
  userId: string
): Promise<{ sessionVersion: number; status: number } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true, status: true },
  });
  if (!user) return null;
  return {
    status: user.status,
    sessionVersion: user.sessionVersion ?? 0,
  };
}
