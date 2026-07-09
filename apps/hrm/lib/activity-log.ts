import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const ACTIVITY_LOG_ENABLED =
  /^(1|true|yes)$/i.test(process.env.ACTIVITY_LOG_ENABLED ?? '');
const ACTIVITY_LOG_LOW_ENABLED =
  process.env.ACTIVITY_LOG_LOW_ENABLED === undefined ||
  /^(1|true|yes)$/i.test(process.env.ACTIVITY_LOG_LOW_ENABLED ?? '1');

export type LogActivityParams = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** low = view/read; medium = optional; high = create/update/delete. Default "high" for backward compat. */
  importance?: 'low' | 'medium' | 'high';
};

/** Returns null; this module must stay import-safe for client-reachable bundles. */
async function getClientIp(): Promise<string | null> {
  return null;
}

/**
 * Universal activity logger. Writes to DB only when ACTIVITY_LOG_ENABLED is "1", "true", or "yes".
 * userId is stored as auth User.id (AUTH_DATABASE_URL) — no Prisma relation across databases.
 * Safe to call from any server code; logs errors without throwing.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  if (!ACTIVITY_LOG_ENABLED) return;
  const importance = params.importance ?? 'high';
  if (importance === 'low' && !ACTIVITY_LOG_LOW_ENABLED) return;

  try {
    const ipAddress = await getClientIp();
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: ipAddress ?? undefined,
        importance: importance ?? undefined
      }
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to write activity:', err);
  }
}

/** Fire-and-forget: schedules activity log without blocking. */
export function logActivityNonBlocking(params: LogActivityParams): void {
  void logActivity(params).catch((err) => {
    console.error('[ActivityLog] Non-blocking write failed:', err);
  });
}
