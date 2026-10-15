import prisma from '@/lib/prisma';

// DPAY defaults to ON so activity logging works out of the box.
const ACTIVITY_LOG_ENABLED =
  process.env.ACTIVITY_LOG_ENABLED === undefined
    ? true
    : /^(1|true|yes)$/i.test(process.env.ACTIVITY_LOG_ENABLED ?? '');

const ACTIVITY_LOG_LOW_ENABLED =
  process.env.ACTIVITY_LOG_LOW_ENABLED === undefined
    ? true
    : /^(1|true|yes)$/i.test(process.env.ACTIVITY_LOG_LOW_ENABLED ?? '');

export type LogActivityParams = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** low = view/read; medium = optional; high = create/update/delete. Default "high" */
  importance?: 'low' | 'medium' | 'high';
};

/**
 * Returns client IP if available. For DPAY we keep it safe for server-only execution.
 */
async function getClientIp(): Promise<string | null> {
  return null;
}

/**
 * Safe server activity logger. Never throws.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  if (!ACTIVITY_LOG_ENABLED) return;

  const importance = params.importance ?? 'high';
  if (importance === 'low' && !ACTIVITY_LOG_LOW_ENABLED) return;

  try {
    const ipAddress = await getClientIp();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activityModel = (prisma as any).activityLog;
    if (!activityModel?.create) return;

    await activityModel.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        metadata: params.metadata ?? undefined,
        ipAddress: ipAddress ?? undefined,
        importance: importance ?? undefined,
      },
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to write activity:', err);
  }
}

/**
 * Fire-and-forget: schedules activity log without blocking response.
 */
export function logActivityNonBlocking(params: LogActivityParams): void {
  void logActivity(params).catch((err) => {
    console.error('[ActivityLog] Non-blocking write failed:', err);
  });
}

