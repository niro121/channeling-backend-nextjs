import prisma from "@/lib/prisma"

const ACTIVITY_LOG_ENABLED =
  /^(1|true|yes)$/i.test(process.env.ACTIVITY_LOG_ENABLED ?? "")
const ACTIVITY_LOG_LOW_ENABLED =
  process.env.ACTIVITY_LOG_LOW_ENABLED === undefined ||
  /^(1|true|yes)$/i.test(process.env.ACTIVITY_LOG_LOW_ENABLED ?? "1")

export type LogActivityParams = {
  userId: string
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  /** low = view/read; medium = optional; high = create/update/delete. Default "high" for backward compat. */
  importance?: "low" | "medium" | "high"
}

/** Returns null; this module must stay import-safe for client-reachable bundles. */
async function getClientIp(): Promise<string | null> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
    return h.get('x-real-ip');
  } catch {
    return null;
  }
}

/**
 * Universal activity logger. Writes to DB only when ACTIVITY_LOG_ENABLED is "1", "true", or "yes".
 * Captures client IP from headers when available. Safe to call from any server code; logs errors without throwing.
 *
 * For non-blocking (fire-and-forget) usage, call without await: void logActivity(...)
 * or use logActivityNonBlocking(params) which never blocks the response.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  if (!ACTIVITY_LOG_ENABLED) return
  const importance = params.importance ?? "high"
  if (importance === "low" && !ACTIVITY_LOG_LOW_ENABLED) return

  try {
    const ipAddress = await getClientIp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PrismaClient.activityLog exists after generate
    const activityModel = (prisma as any).activityLog
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
    })
  } catch (err) {
    console.error("[ActivityLog] Failed to write activity:", err)
  }
}

/** Fire-and-forget: schedules activity log without blocking. Use this so responses are not delayed by the DB write. */
export function logActivityNonBlocking(params: LogActivityParams): void {
  void logActivity(params).catch((err) => {
    console.error("[ActivityLog] Non-blocking write failed:", err)
  })
}
