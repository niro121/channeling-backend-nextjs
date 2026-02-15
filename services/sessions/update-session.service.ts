'use server';

import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export interface UpdateSessionInput {
  startTime: number;
  endTime: number;
  durationMinutes?: number | null;
  maxPatientNumber: number;
  /** Logged-in user id for updatedBy */
  updatedBy?: string;
}

export async function updateSessionService(
  sessionId: string,
  data: UpdateSessionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes ?? null,
        maxPatientNumber: data.maxPatientNumber,
        ...(data.updatedBy ? { updatedBy: data.updatedBy } : {}),
      },
      include: { doctor: true, location: true },
    });

    if (data.updatedBy) {
      await logActivity({
        userId: data.updatedBy,
        action: 'session.updated',
        entityType: 'Session',
        entityId: sessionId,
        metadata: {
          sessionId,
          doctorId: updated.doctorId,
          doctorName: updated.doctor?.name ?? null,
          sessionDate: updated.date instanceof Date ? updated.date.toISOString() : String(updated.date),
          locationName: updated.location?.name ?? null,
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateSessionService error:', error);
    return { success: false, error: error.message ?? 'Failed to update session' };
  }
}
