'use server';

import prisma from '@/lib/prisma';
import { logActivityNonBlocking } from '@/lib/activity-log';

export async function deleteSessionService(
  sessionId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { doctor: true, location: true },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (userId) {
      logActivityNonBlocking({
        userId,
        action: 'session.deleted',
        entityType: 'Session',
        entityId: sessionId,
        metadata: {
          sessionId,
          doctorId: session.doctorId,
          doctorName: session.doctor?.name ?? null,
          sessionDate: session.date instanceof Date ? session.date.toISOString() : String(session.date),
          locationName: session.location?.name ?? null,
          locationId: session.locationId,
        },
      });
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });
    return { success: true };
  } catch (error: any) {
    console.error('deleteSessionService error:', error);
    return { success: false, error: error.message ?? 'Failed to delete session' };
  }
}
