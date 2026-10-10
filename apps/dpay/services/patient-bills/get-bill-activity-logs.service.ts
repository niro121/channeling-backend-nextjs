import prisma from '@/lib/prisma';
import { authPrisma } from '@archmage/db-auth';

export type BillActivityLogEntry = {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  importance: string | null;
  createdAt: string;
};

export type GetBillActivityLogsResult =
  | { success: true; data: BillActivityLogEntry[] }
  | { success: false; message: string };

/**
 * Loads ActivityLog rows for a patient bill, including related line items and receipts.
 */
export async function getBillActivityLogs(
  billId: string,
  relatedEntityIds: string[] = []
): Promise<GetBillActivityLogsResult> {
  if (!billId?.trim()) {
    return { success: false, message: 'Bill id is required.' };
  }

  try {
    const entityIds = [...new Set([billId, ...relatedEntityIds.filter(Boolean)])];

    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { entityId: { in: entityIds } },
          {
            AND: [
              { entityType: 'PatientBill' },
              { entityId: billId },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))];
    const users =
      userIds.length > 0
        ? await authPrisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(users.map((user) => [user.id, user.name]));

    return {
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: nameById.get(log.userId) ?? null,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? null,
        metadata: (log.metadata as Record<string, unknown> | null) ?? null,
        importance: log.importance ?? null,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  } catch (error: unknown) {
    console.error('getBillActivityLogs error', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load bill activity',
    };
  }
}
