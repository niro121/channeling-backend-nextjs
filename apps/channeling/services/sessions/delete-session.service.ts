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
    if (session.hidden) {
      return { success: false, error: 'A hidden session cannot be deleted.' };
    }

    const bookingCount = await prisma.booking.count({
      where: { sessionId },
    });
    if (bookingCount > 0) {
      return {
        success: false,
        error: 'This session has bookings and cannot be deleted.',
      };
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

const MAX_BULK_DELETE = 200;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const sessionDateLabel = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Colombo',
});

type SessionBlockReason = 'hidden' | 'has_bookings' | 'not_found';

type ClassifiedSession = {
  id: string;
  doctorId: string | null;
  doctorName: string | null;
  locationId: string | null;
  locationName: string | null;
  sessionDateIso: string;
  label: string;
  blockReason: SessionBlockReason | null;
};

function uniqueSessionIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id) || !OBJECT_ID_RE.test(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function sessionLabel(session: {
  date: Date;
  doctor?: { name: string | null } | null;
  location?: { name: string | null } | null;
}): { label: string; sessionDateIso: string } {
  const sessionDateIso = session.date instanceof Date ? session.date.toISOString() : String(session.date);
  const dateLabel = sessionDateLabel.format(session.date instanceof Date ? session.date : new Date(session.date));
  const doctor = session.doctor?.name?.trim() || 'Unknown doctor';
  const location = session.location?.name?.trim();
  return {
    sessionDateIso,
    label: location ? `${doctor} — ${dateLabel} (${location})` : `${doctor} — ${dateLabel}`,
  };
}

function blockReasonText(reason: SessionBlockReason): string {
  if (reason === 'hidden') return 'hidden session';
  if (reason === 'has_bookings') return 'has bookings';
  return 'not found';
}

function listedLines(items: string[], max = 8): string[] {
  const lines = items.slice(0, max).map((item) => `• ${item}`);
  if (items.length > max) lines.push(`• and ${items.length - max} more`);
  return lines;
}

function skipSummary(blocked: ClassifiedSession[]): string {
  const bookings = blocked.filter((session) => session.blockReason === 'has_bookings').length;
  const hidden = blocked.filter((session) => session.blockReason === 'hidden').length;
  const missing = blocked.filter((session) => session.blockReason === 'not_found').length;
  const parts: string[] = [];
  if (bookings > 0) parts.push(bookings === 1 ? '1 has bookings' : `${bookings} have bookings`);
  if (hidden > 0) parts.push(hidden === 1 ? '1 is a hidden session' : `${hidden} are hidden sessions`);
  if (missing > 0) parts.push(missing === 1 ? '1 was not found' : `${missing} were not found`);
  return parts.join(', ');
}

function confirmationMessage(deletable: ClassifiedSession[], blocked: ClassifiedSession[]): string {
  if (deletable.length === 0) {
    const lines = ['None of the selected sessions can be deleted.'];
    const details = blocked
      .filter((session) => session.blockReason !== 'not_found')
      .map((session) => `${session.label} — ${blockReasonText(session.blockReason!)}`);
    if (details.length > 0) {
      lines.push('', 'These selected sessions cannot be deleted:', ...listedLines(details));
    }
    const missing = blocked.filter((session) => session.blockReason === 'not_found').length;
    if (missing > 0) {
      lines.push('', missing === 1 ? '1 selected session was not found.' : `${missing} selected sessions were not found.`);
    }
    return lines.join('\n');
  }

  const countLabel =
    deletable.length === 1
      ? 'This will permanently delete 1 session and remove it from the list.'
      : `This will permanently delete ${deletable.length} sessions and remove them from the list.`;
  const lines = ['This action cannot be undone.', countLabel];
  const skipped = blocked
    .filter((session) => session.blockReason !== 'not_found')
    .map((session) => `${session.label} — ${blockReasonText(session.blockReason!)}`);
  if (skipped.length > 0) {
    lines.push('', 'These selected sessions will be skipped:', ...listedLines(skipped));
  }
  const missing = blocked.filter((session) => session.blockReason === 'not_found').length;
  if (missing > 0) {
    lines.push('', missing === 1 ? '1 selected session was not found and will be skipped.' : `${missing} selected sessions were not found and will be skipped.`);
  }
  return lines.join('\n');
}

function resultMessage(deletedCount: number, blocked: ClassifiedSession[]): string {
  const deleted =
    deletedCount === 1 ? '1 session deleted.' : `${deletedCount} sessions deleted.`;
  if (blocked.length === 0) return deleted;
  const skipped =
    blocked.length === 1 ? '1 session was skipped' : `${blocked.length} sessions were skipped`;
  return `${deleted} ${skipped} (${skipSummary(blocked)}).`;
}

async function classifySessionsForDelete(ids: string[]): Promise<{
  deletable: ClassifiedSession[];
  blocked: ClassifiedSession[];
  error?: string;
}> {
  const uniqueIds = uniqueSessionIds(ids);
  if (uniqueIds.length === 0) {
    return { deletable: [], blocked: [], error: 'Select at least one session.' };
  }
  if (uniqueIds.length > MAX_BULK_DELETE) {
    return {
      deletable: [],
      blocked: [],
      error: `You can delete up to ${MAX_BULK_DELETE} sessions at a time.`,
    };
  }

  const [sessions, bookingCounts] = await Promise.all([
    prisma.session.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        hidden: true,
        doctorId: true,
        locationId: true,
        date: true,
        doctor: { select: { name: true } },
        location: { select: { name: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: uniqueIds } },
      _count: { id: true },
    }),
  ]);

  const bookingsBySession = new Map<string, number>();
  for (const row of bookingCounts) {
    if (row.sessionId) bookingsBySession.set(row.sessionId, row._count.id);
  }
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const deletable: ClassifiedSession[] = [];
  const blocked: ClassifiedSession[] = [];

  for (const id of uniqueIds) {
    const session = sessionsById.get(id);
    if (!session) {
      blocked.push({
        id,
        doctorId: null,
        doctorName: null,
        locationId: null,
        locationName: null,
        sessionDateIso: '',
        label: 'Session not found',
        blockReason: 'not_found',
      });
      continue;
    }

    const labeled = sessionLabel(session);
    const candidate: ClassifiedSession = {
      id: session.id,
      doctorId: session.doctorId,
      doctorName: session.doctor?.name ?? null,
      locationId: session.locationId,
      locationName: session.location?.name ?? null,
      sessionDateIso: labeled.sessionDateIso,
      label: labeled.label,
      blockReason: null,
    };

    if (session.hidden) {
      blocked.push({ ...candidate, blockReason: 'hidden' });
      continue;
    }
    if ((bookingsBySession.get(id) ?? 0) > 0) {
      blocked.push({ ...candidate, blockReason: 'has_bookings' });
      continue;
    }
    deletable.push(candidate);
  }

  return { deletable, blocked };
}

export async function previewSessionBulkDeleteService(ids: string[]): Promise<string> {
  const classified = await classifySessionsForDelete(ids);
  if (classified.error) return classified.error;
  return confirmationMessage(classified.deletable, classified.blocked);
}

export async function bulkDeleteSessionsService(
  ids: string[],
  userId?: string
): Promise<{ success: boolean; message?: string; error?: string; deletedCount: number }> {
  try {
    const classified = await classifySessionsForDelete(ids);
    if (classified.error) {
      return { success: false, error: classified.error, deletedCount: 0 };
    }

    let { deletable, blocked } = classified;
    if (deletable.length > 0) {
      const freshCounts = await prisma.booking.groupBy({
        by: ['sessionId'],
        where: { sessionId: { in: deletable.map((session) => session.id) } },
        _count: { id: true },
      });
      const bookedIds = new Set(
        freshCounts.filter((row) => row.sessionId && row._count.id > 0).map((row) => row.sessionId as string)
      );
      if (bookedIds.size > 0) {
        const stillDeletable: ClassifiedSession[] = [];
        for (const session of deletable) {
          if (bookedIds.has(session.id)) {
            blocked.push({ ...session, blockReason: 'has_bookings' });
          } else {
            stillDeletable.push(session);
          }
        }
        deletable = stillDeletable;
      }
    }

    if (deletable.length === 0) {
      return {
        success: false,
        error: confirmationMessage(deletable, blocked),
        deletedCount: 0,
      };
    }

    const result = await prisma.session.deleteMany({
      where: { id: { in: deletable.map((session) => session.id) } },
    });

    if (result.count === 0) {
      return { success: false, error: 'No sessions were deleted.', deletedCount: 0 };
    }

    if (userId) {
      for (const session of deletable) {
        logActivityNonBlocking({
          userId,
          action: 'session.deleted',
          entityType: 'Session',
          entityId: session.id,
          metadata: {
            sessionId: session.id,
            doctorId: session.doctorId,
            doctorName: session.doctorName,
            sessionDate: session.sessionDateIso,
            locationName: session.locationName,
            locationId: session.locationId,
            bulk: true,
          },
        });
      }
      logActivityNonBlocking({
        userId,
        action: 'sessions.sessions.bulkDeleted',
        entityType: 'Session',
        importance: 'high',
        metadata: {
          count: result.count,
          sessionIds: deletable.map((session) => session.id),
          skippedCount: blocked.length,
        },
      });
    }

    return {
      success: true,
      deletedCount: result.count,
      message: resultMessage(result.count, blocked),
    };
  } catch (error: any) {
    console.error('bulkDeleteSessionsService error:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error.message ?? 'Failed to delete sessions',
    };
  }
}
