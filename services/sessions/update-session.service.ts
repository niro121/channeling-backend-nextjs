'use server';

import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import moment from 'moment';

export interface UpdateSessionInput {
  startTime: Date;
  endTime: Date;
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
    const existing = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { date: true },
    });
    if (!existing) {
      return { success: false, error: 'Session not found.' };
    }
    const sessionDateStr = moment(existing.date).format('YYYY-MM-DD');
    const todayStr = moment().format('YYYY-MM-DD');
    if (sessionDateStr < todayStr) {
      return { success: false, error: 'Cannot edit a session that is in the past.' };
    }

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
