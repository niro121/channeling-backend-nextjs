import 'server-only';

import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { ROOM_STAYS } from '@/lib/room-checklist-access';
import { createNotification } from '@/services/notification.service';
import { REFERENCE_TYPES } from '@/types/notification';
import type { Permissions } from '@/types/user-group';
import {
  ROOM_CONCERN_KINDS,
  ROOM_CONCERN_KIND_LABEL,
  ROOM_REQUEST_CATEGORY_LABEL,
  type RoomConcernKind,
  type RoomConcernLevel,
  type RoomConcernRow,
  type RoomConcernSource,
  type RoomFeedbackRow,
  type RoomRequestCategory,
} from '@/types/room-request';

/**
 * Concerns about patients in rooms, and their stay ratings. A concern is raised by Inward Ayu while
 * chatting, by a rule (request overdue, asked twice, low rating) or by a later scan; the same problem
 * on the same stay adds to the open concern instead of making a new one. Staff with alerts get a
 * notification when one is raised or becomes serious.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const MIN = 60_000;
/** A request still "new" this long, or "in progress" this long, raises a concern. */
export const REQUEST_NEW_LIMIT_MIN = 30;
export const REQUEST_PROGRESS_LIMIT_MIN = 120;

function toConcernRow(c: {
  id: string; level: string; kind: string; source: string; summary: string; quote: string | null; raisedByName: string | null;
  raisedByRole: string | null; count: number; status: string; note: string | null; handledByName: string | null; handledAt: Date | null;
  createdAt: Date; lastAt: Date;
}): RoomConcernRow {
  return {
    id: c.id,
    level: c.level === 'serious' ? 'serious' : 'attention',
    kind: ((ROOM_CONCERN_KINDS as readonly string[]).includes(c.kind) ? c.kind : 'other') as RoomConcernKind,
    source: c.source as RoomConcernSource,
    summary: c.summary,
    quote: c.quote,
    raisedByName: c.raisedByName,
    raisedByRole: c.raisedByRole === 'patient' || c.raisedByRole === 'contact' ? c.raisedByRole : null,
    count: c.count,
    status: c.status === 'looking' || c.status === 'resolved' ? c.status : 'open',
    note: c.note,
    handledByName: c.handledByName,
    handledAt: c.handledAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    lastAt: c.lastAt.toISOString(),
  };
}

/** GROs (check in or out) and anyone with Room Check-in / Check-out → alerts. */
async function concernRecipients() {
  const groups = await prisma.userGroup.findMany({ where: { status: 1 }, select: { id: true, permissions: true } });
  const ids = groups
    .filter((g) => {
      const p = g.permissions as unknown as Permissions;
      return ['check-in', 'check-out', 'alerts'].some((a) => hasPermission(p, ROOM_STAYS, a));
    })
    .map((g) => g.id);
  if (!ids.length) return [];
  const users = await prisma.user.findMany({ where: { userGroupId: { in: ids }, status: 1 }, select: { id: true } });
  return users.map((u) => u.id);
}

async function notifyConcern(stayId: string, title: string, message: string) {
  try {
    const recipients = await concernRecipients();
    await Promise.all(
      recipients.map((userId) =>
        createNotification({ userId, type: 'room_concern', title, message, referenceType: REFERENCE_TYPES.RoomStay, referenceId: stayId })
      )
    );
  } catch (e) {
    console.error('[room-concerns] notify failed', e);
  }
}

/**
 * Raise a concern, or add to the open one for the same problem (dedupeKey). Alerts staff when it's
 * new, or when it becomes serious.
 */
export async function raiseConcern(input: {
  stayId: string;
  level: RoomConcernLevel;
  kind: RoomConcernKind;
  source: RoomConcernSource;
  summary: string;
  quote?: string | null;
  raisedByName?: string | null;
  raisedByRole?: string | null;
  dedupeKey?: string;
  /** The chat scan: leave an open concern of the same kind as it is (don't add to its count). */
  skipIfOpen?: boolean;
}): Promise<RoomConcernRow | null> {
  const stay = await prisma.roomStay.findUnique({
    where: { id: input.stayId },
    select: { id: true, roomId: true, patientName: true, room: { select: { number: true } } },
  });
  if (!stay) throw new Error('Stay not found');
  const kind = (ROOM_CONCERN_KINDS as readonly string[]).includes(input.kind) ? input.kind : 'other';
  const summary = input.summary.trim().slice(0, 300) || ROOM_CONCERN_KIND_LABEL[kind as RoomConcernKind];
  const quote = input.quote?.trim().slice(0, 500) || null;
  const dedupeKey = input.dedupeKey ?? `${stay.id}:${kind}`;
  const existing = await prisma.roomConcern.findFirst({
    where: { dedupeKey, status: { in: ['open', 'looking'] } },
    orderBy: { createdAt: 'desc' },
  });
  const title = (level: string) =>
    `${level === 'serious' ? '⚠ ' : ''}Room ${stay.room.number}: ${ROOM_CONCERN_KIND_LABEL[kind as RoomConcernKind]}`;
  const message = `${summary}${quote ? ` · "${quote}"` : ''} (${stay.patientName})`;

  if (existing && input.skipIfOpen) return null;
  if (existing) {
    const becameSerious = input.level === 'serious' && existing.level !== 'serious';
    const row = await prisma.roomConcern.update({
      where: { id: existing.id },
      data: {
        count: { increment: 1 },
        lastAt: new Date(),
        summary,
        ...(quote ? { quote } : {}),
        ...(becameSerious ? { level: 'serious' } : {}),
        // It happened again: back on the GROs' list even if someone was looking into it.
        status: 'open',
      },
    });
    if (becameSerious) await notifyConcern(stay.id, title('serious'), message);
    return toConcernRow(row);
  }

  const row = await prisma.roomConcern.create({
    data: {
      stayId: stay.id,
      roomId: stay.roomId,
      level: input.level === 'serious' ? 'serious' : 'attention',
      kind,
      source: input.source,
      summary,
      quote,
      raisedByName: input.raisedByName ?? null,
      raisedByRole: input.raisedByRole ?? null,
      dedupeKey,
    },
  });
  await notifyConcern(stay.id, title(row.level), message);
  return toConcernRow(row);
}

export async function listConcernsForStay(stayId: string): Promise<RoomConcernRow[]> {
  if (!OBJECT_ID.test(stayId)) return [];
  const rows = await prisma.roomConcern.findMany({ where: { stayId }, orderBy: [{ lastAt: 'desc' }], take: 100 });
  // Open first (serious before attention), then the rest, newest first.
  const rank = (r: RoomConcernRow) => (r.status === 'resolved' ? 2 : r.level === 'serious' ? 0 : 1);
  return rows.map(toConcernRow).sort((a, b) => rank(a) - rank(b) || b.lastAt.localeCompare(a.lastAt));
}

/** Open (not resolved) concerns per stay, and whether any is serious. */
export async function openConcernsByStay(stayIds: string[]) {
  if (!stayIds.length) return new Map<string, { open: number; serious: boolean }>();
  const rows = await prisma.roomConcern.findMany({
    where: { stayId: { in: stayIds }, status: { in: ['open', 'looking'] } },
    select: { stayId: true, level: true },
  });
  const out = new Map<string, { open: number; serious: boolean }>();
  for (const r of rows) {
    const cur = out.get(r.stayId) ?? { open: 0, serious: false };
    cur.open++;
    if (r.level === 'serious') cur.serious = true;
    out.set(r.stayId, cur);
  }
  return out;
}

export async function updateConcernStatus(
  id: string,
  input: { status: string; note?: string | null },
  user: { id: string; name: string | null }
) {
  if (!OBJECT_ID.test(id)) throw new Error('Concern not found.');
  if (!['open', 'looking', 'resolved'].includes(input.status)) throw new Error('Invalid status.');
  const note = input.note?.trim().slice(0, 300) || null;
  const row = await prisma.roomConcern.update({
    where: { id },
    data: { status: input.status, ...(note ? { note } : {}), handledBy: user.id, handledByName: user.name, handledAt: new Date() },
  });
  return { stayId: row.stayId, concern: toConcernRow(row) };
}

// ==== FEEDBACK ==== //

export async function recordFeedback(input: { stayId: string; rating: number; comment?: string | null; byName?: string | null; byRole?: string | null }) {
  const rating = Math.round(Number(input.rating));
  if (!(rating >= 1 && rating <= 5)) throw new Error('Rating must be 1 to 5.');
  const stay = await prisma.roomStay.findUnique({ where: { id: input.stayId }, select: { roomId: true } });
  if (!stay) throw new Error('Stay not found');
  const comment = input.comment?.trim().slice(0, 500) || null;
  const row = await prisma.roomFeedback.create({
    data: { stayId: input.stayId, roomId: stay.roomId, rating, comment, byName: input.byName ?? null, byRole: input.byRole ?? null },
  });
  // Rule: 1 or 2 out of 5 is a concern (serious at 1).
  if (rating <= 2) {
    await raiseConcern({
      stayId: input.stayId,
      level: rating === 1 ? 'serious' : 'attention',
      kind: 'low_rating',
      source: 'feedback',
      summary: `Rated their stay ${rating} out of 5`,
      quote: comment,
      raisedByName: input.byName,
      raisedByRole: input.byRole,
    });
  }
  return toFeedbackRow(row);
}

function toFeedbackRow(r: { id: string; rating: number; comment: string | null; byName: string | null; byRole: string | null; createdAt: Date }): RoomFeedbackRow {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    byName: r.byName,
    byRole: r.byRole === 'patient' || r.byRole === 'contact' ? r.byRole : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listFeedbackForStay(stayId: string): Promise<RoomFeedbackRow[]> {
  if (!OBJECT_ID.test(stayId)) return [];
  const rows = await prisma.roomFeedback.findMany({ where: { stayId }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map(toFeedbackRow);
}

// ==== RULES (no AI) ==== //

/** A request asked again while the first is still open: raise "asked again". */
export async function checkRepeatRequest(input: { stayId: string; category: RoomRequestCategory; newRequestId: string; byName: string | null; byRole: string | null }) {
  const earlier = await prisma.roomRequest.findFirst({
    where: { stayId: input.stayId, category: input.category, status: { in: ['new', 'in_progress'] }, id: { not: input.newRequestId } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  if (!earlier) return;
  const mins = Math.round((Date.now() - earlier.createdAt.getTime()) / MIN);
  await raiseConcern({
    stayId: input.stayId,
    level: 'attention',
    kind: 'repeat_request',
    source: 'rule',
    summary: `Asked again for ${ROOM_REQUEST_CATEGORY_LABEL[input.category].toLowerCase()}; the first request is ${mins} min old and not done`,
    raisedByName: input.byName,
    raisedByRole: input.byRole,
    dedupeKey: `${input.stayId}:repeat:${input.category}`,
  });
}

/** Requests left waiting too long raise "request overdue" (one concern per request). Cheap: runs on a timer. */
export async function sweepLateRequests(now = new Date()) {
  const late = await prisma.roomRequest.findMany({
    where: {
      stay: { status: 'occupied' },
      OR: [
        { status: 'new', createdAt: { lte: new Date(now.getTime() - REQUEST_NEW_LIMIT_MIN * MIN) } },
        { status: 'in_progress', updatedAt: { lte: new Date(now.getTime() - REQUEST_PROGRESS_LIMIT_MIN * MIN) } },
      ],
    },
    select: { id: true, stayId: true, category: true, details: true, status: true, createdAt: true, requestedByName: true, requestedByRole: true },
    take: 200,
  });
  let raised = 0;
  for (const r of late) {
    const key = `request:${r.id}:late`;
    if (await prisma.roomConcern.count({ where: { dedupeKey: key } })) continue; // once per request
    const mins = Math.round((now.getTime() - r.createdAt.getTime()) / MIN);
    await raiseConcern({
      stayId: r.stayId,
      level: mins >= REQUEST_PROGRESS_LIMIT_MIN ? 'serious' : 'attention',
      kind: 'late_request',
      source: 'rule',
      summary: `${ROOM_REQUEST_CATEGORY_LABEL[r.category as RoomRequestCategory] ?? 'Request'} waiting ${mins} min (${r.status === 'new' ? 'nobody has picked it up' : 'still in progress'})`,
      quote: r.details,
      raisedByName: r.requestedByName,
      raisedByRole: r.requestedByRole,
      dedupeKey: key,
    });
    raised++;
  }
  return raised;
}
