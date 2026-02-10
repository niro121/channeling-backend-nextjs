import prisma from "@/lib/prisma"

const ACTIVITY_LOG_ENABLED =
  /^(1|true|yes)$/i.test(process.env.ACTIVITY_LOG_ENABLED ?? "")

export type LogActivityParams = {
  userId: string
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Universal activity logger. Writes to DB only when ACTIVITY_LOG_ENABLED is "1", "true", or "yes".
 * Safe to call from any server code; logs errors without throwing.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  if (!ACTIVITY_LOG_ENABLED) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PrismaClient.activityLog exists after generate
    const activityModel = (prisma as any).activityLog
    await activityModel.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        metadata: params.metadata ?? undefined,
      },
    })
  } catch (err) {
    console.error("[ActivityLog] Failed to write activity:", err)
  }
}
