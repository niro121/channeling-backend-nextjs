import 'server-only';

import { randomBytes } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { ROOM_STAYS } from '@/lib/room-checklist-access';
import { createNotification } from '@/services/notification.service';
import { checkRepeatRequest, raiseConcern, recordFeedback } from '@/services/room-concerns.service';
import { ROOM_CONCERN_KINDS } from '@/types/room-request';
import { REFERENCE_TYPES } from '@/types/notification';
import type { Permissions } from '@/types/user-group';
import {
  ROOM_REQUEST_CATEGORIES,
  ROOM_REQUEST_CATEGORY_LABEL,
  ROOM_REQUEST_STATUSES,
  type RoomRequestCategory,
  type RoomRequestRow,
  type RoomRequestStatus,
} from '@/types/room-request';

/**
 * In-room Ayu: the QR code printed in each room, checking that a verified phone belongs to the
 * room's current stay, and patient requests that GROs handle. The caddie (public room page) and
 * Ayu call this through /api/public/ayu-room/* with AYU_ROOM_SERVICE_KEY; staff use it directly.
 */
export class RoomAyuError extends Error {
  constructor(message: string, readonly code: 'invalid_input' | 'not_found' | 'not_on_stay' | 'forbidden' = 'invalid_input') {
    super(message);
  }
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;
// No 0/O/1/I/L: easy to read if someone types it from a sticker.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function newCode(): string {
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Sri Lankan mobile to its last 9 digits (7XXXXXXXX), so 077…, +9477… and 9477… compare equal. */
export function phoneKey(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  const m = digits.match(/(7\d{8})$/);
  return m ? m[1] : null;
}

// ==== QR CODES ==== //

/** The room's QR code, created on first use. */
export async function ensureRoomCode(roomId: string, userId: string | null): Promise<string> {
  if (!OBJECT_ID.test(roomId)) throw new RoomAyuError('Invalid room.');
  const existing = await prisma.roomAyuCode.findUnique({ where: { roomId } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await prisma.roomAyuCode.create({ data: { roomId, code: newCode(), createdBy: userId } });
      return row.code;
    } catch {
      const again = await prisma.roomAyuCode.findUnique({ where: { roomId } });
      if (again) return again.code; // created at the same time by someone else
    }
  }
  throw new RoomAyuError('Could not create a room code. Try again.');
}

/** New code for a room; old stickers stop working. */
export async function reissueRoomCode(roomId: string, userId: string): Promise<string> {
  if (!OBJECT_ID.test(roomId)) throw new RoomAyuError('Invalid room.');
  await prisma.roomAyuCode.deleteMany({ where: { roomId } });
  return ensureRoomCode(roomId, userId);
}

/** Rooms for printing, each with its code (created for rooms that don't have one yet). */
export async function roomsForPrinting(filter: { locationId?: string | null; zoneId?: string | null; roomIds?: string[] }, userId: string) {
  const rooms = await prisma.room.findMany({
    where: {
      ...(filter.locationId && OBJECT_ID.test(filter.locationId) ? { locationId: filter.locationId } : {}),
      ...(filter.zoneId && OBJECT_ID.test(filter.zoneId) ? { zoneId: filter.zoneId } : {}),
      ...(filter.roomIds?.length ? { id: { in: filter.roomIds.filter((id) => OBJECT_ID.test(id)) } } : {}),
    },
    select: { id: true, number: true, zone: { select: { name: true } }, location: { select: { name: true } } },
  });
  rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  const out = [];
  for (const r of rooms.slice(0, 300)) {
    out.push({
      roomId: r.id,
      number: r.number,
      zone: r.zone?.name ?? null,
      branch: r.location?.name ?? null,
      code: await ensureRoomCode(r.id, userId),
    });
  }
  return out;
}

// ==== PUBLIC: ROOM PAGE ==== //

async function roomByCode(code: string) {
  const clean = String(code ?? '').trim().toLowerCase();
  if (!/^[a-z0-9]{6,20}$/.test(clean)) throw new RoomAyuError('This room code is not valid.', 'not_found');
  const row = await prisma.roomAyuCode.findUnique({ where: { code: clean } });
  if (!row) throw new RoomAyuError('This room code is not valid.', 'not_found');
  const room = await prisma.room.findUnique({
    where: { id: row.roomId },
    select: { id: true, number: true, zone: { select: { name: true } }, location: { select: { name: true } } },
  });
  if (!room) throw new RoomAyuError('This room code is not valid.', 'not_found');
  return room;
}

/** What the room page may show before anyone verifies: the room, and whether a patient is in it. No names. */
export async function publicRoomInfo(code: string) {
  const room = await roomByCode(code);
  const occupied = await prisma.roomStay.count({ where: { roomId: room.id, status: 'occupied' } });
  return { roomNumber: room.number, zone: room.zone?.name ?? null, branch: room.location?.name ?? null, hasPatient: occupied > 0 };
}

/**
 * Is this (already SMS-verified) phone the patient's or an authorised contact's on the room's current
 * stay? Only on a match does it say who they are and which stay; never lists numbers.
 */
export async function matchRoomPhone(code: string, rawPhone: string) {
  const room = await roomByCode(code);
  const key = phoneKey(rawPhone);
  if (!key) throw new RoomAyuError('Enter a valid mobile number.');
  const stay = await prisma.roomStay.findFirst({
    where: { roomId: room.id, status: 'occupied' },
    select: {
      id: true,
      patientName: true,
      bhtNumber: true,
      patientPhone: true,
      checkedInAt: true,
      contacts: { select: { name: true, phone: true, relationship: true } },
    },
  });
  if (!stay) return { matched: false as const, reason: 'no_patient' as const, roomNumber: room.number };
  const patientFirst = stay.patientName.trim().split(/\s+/)[0] ?? stay.patientName;
  if (phoneKey(stay.patientPhone) === key) {
    return { matched: true as const, stayId: stay.id, roomNumber: room.number, role: 'patient' as const, name: stay.patientName, patientName: stay.patientName, patientFirstName: patientFirst, bhtNumber: stay.bhtNumber, checkedInAt: stay.checkedInAt.toISOString() };
  }
  const contact = stay.contacts.find((c) => phoneKey(c.phone) === key);
  if (contact) {
    return { matched: true as const, stayId: stay.id, roomNumber: room.number, role: 'contact' as const, name: contact.name, relationship: contact.relationship, patientName: stay.patientName, patientFirstName: patientFirst, bhtNumber: stay.bhtNumber, checkedInAt: stay.checkedInAt.toISOString() };
  }
  return { matched: false as const, reason: 'not_on_stay' as const, roomNumber: room.number };
}

/** Re-checks on every request that the phone still belongs to that stay and the patient hasn't left. */
async function requireOnStay(code: string, stayId: string, phone: string) {
  const m = await matchRoomPhone(code, phone);
  if (!m.matched || m.stayId !== stayId) {
    throw new RoomAyuError(
      m.matched ? 'This chat belongs to an earlier stay in this room.' : m.reason === 'no_patient' ? 'There is no patient checked in to this room now.' : 'This number is not registered for this room.',
      'not_on_stay'
    );
  }
  return m;
}

function toRow(r: {
  id: string; category: string; details: string | null; status: string; requestedByName: string | null; requestedByRole: string | null;
  note: string | null; handledByName: string | null; handledAt: Date | null; createdAt: Date; updatedAt: Date;
}): RoomRequestRow {
  return {
    id: r.id,
    category: r.category as RoomRequestCategory,
    details: r.details,
    status: r.status as RoomRequestStatus,
    requestedByName: r.requestedByName,
    requestedByRole: r.requestedByRole === 'patient' || r.requestedByRole === 'contact' ? r.requestedByRole : null,
    note: r.note,
    handledByName: r.handledByName,
    handledAt: r.handledAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const requestSchema = z.object({
  category: z.enum(ROOM_REQUEST_CATEGORIES),
  details: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
});

/** GROs: anyone who checks patients in or out. */
async function groRecipients() {
  const groups = await prisma.userGroup.findMany({ where: { status: 1 }, select: { id: true, permissions: true } });
  const ids = groups
    .filter((g) => {
      const p = g.permissions as unknown as Permissions;
      return hasPermission(p, ROOM_STAYS, 'check-in') || hasPermission(p, ROOM_STAYS, 'check-out');
    })
    .map((g) => g.id);
  if (!ids.length) return [];
  const users = await prisma.user.findMany({ where: { userGroupId: { in: ids }, status: 1 }, select: { id: true } });
  return users.map((u) => u.id);
}

/** A patient's request from the room. Tells every GRO. */
export async function createRoomRequest(input: { code: string; stayId: string; phone: string; category: string; details?: string | null }) {
  const who = await requireOnStay(input.code, input.stayId, input.phone);
  const parsed = requestSchema.safeParse({ category: input.category, details: input.details ?? undefined });
  if (!parsed.success) throw new RoomAyuError('Choose what you need: towels, cleaning, food, Wi-Fi, TV, something broken, or other.');
  const room = await prisma.roomStay.findUnique({ where: { id: who.stayId }, select: { roomId: true } });
  const row = await prisma.roomRequest.create({
    data: {
      stayId: who.stayId,
      roomId: room!.roomId,
      category: parsed.data.category,
      details: parsed.data.details,
      requestedByName: who.name,
      requestedByPhone: phoneKey(input.phone),
      requestedByRole: who.role,
      source: 'ayu',
    },
  });
  try {
    const label = ROOM_REQUEST_CATEGORY_LABEL[parsed.data.category];
    const by = who.role === 'patient' ? 'the patient' : `${who.name}${'relationship' in who && who.relationship ? ` (${who.relationship})` : ''}`;
    const recipients = await groRecipients();
    await Promise.all(
      recipients.map((userId) =>
        createNotification({
          userId,
          type: 'room_request',
          title: `Room ${who.roomNumber}: ${label}`,
          message: `${parsed.data.details ? `${parsed.data.details} · ` : ''}Asked by ${by} for ${who.patientName}.`,
          referenceType: REFERENCE_TYPES.RoomStay,
          referenceId: who.stayId,
        })
      )
    );
  } catch (e) {
    console.error('[room-ayu] notify failed', e);
  }
  await checkRepeatRequest({ stayId: who.stayId, category: parsed.data.category, newRequestId: row.id, byName: who.name, byRole: who.role }).catch((e) =>
    console.error('[room-ayu] repeat check failed', e)
  );
  return toRow(row);
}

/** The stay's requests, for the patient's chat (after re-checking the phone). */
export async function listRoomRequestsForPatient(input: { code: string; stayId: string; phone: string }) {
  const who = await requireOnStay(input.code, input.stayId, input.phone);
  const rows = await prisma.roomRequest.findMany({ where: { stayId: who.stayId }, orderBy: { createdAt: 'desc' }, take: 30 });
  return rows.map(toRow);
}

// ==== STAFF ==== //

export async function listRoomRequestsForStay(stayId: string): Promise<RoomRequestRow[]> {
  if (!OBJECT_ID.test(stayId)) return [];
  const rows = await prisma.roomRequest.findMany({ where: { stayId }, orderBy: { createdAt: 'desc' }, take: 100 });
  return rows.map(toRow);
}

/** A GRO moves a request along. */
export async function updateRoomRequestStatus(id: string, input: { status: string; note?: string | null }, user: { id: string; name: string | null }) {
  if (!OBJECT_ID.test(id)) throw new RoomAyuError('Request not found.', 'not_found');
  if (!(ROOM_REQUEST_STATUSES as readonly string[]).includes(input.status)) throw new RoomAyuError('Invalid status.');
  const existing = await prisma.roomRequest.findUnique({ where: { id }, select: { id: true, stayId: true } });
  if (!existing) throw new RoomAyuError('Request not found.', 'not_found');
  const note = input.note?.trim().slice(0, 300) || null;
  const row = await prisma.roomRequest.update({
    where: { id },
    data: { status: input.status, ...(note !== null ? { note } : {}), handledBy: user.id, handledByName: user.name, handledAt: new Date() },
  });
  return { stayId: existing.stayId, request: toRow(row) };
}

// ==== CONCERNS AND FEEDBACK FROM INWARD AYU ==== //

/** Inward Ayu noticed something a GRO should look at (unhappy, complaint, pain, a worried family…). */
export async function raiseConcernFromRoom(input: {
  code: string; stayId: string; phone: string; level: string; kind: string; summary: string; quote?: string | null;
  /** "scan": found by Ayu's later review of the chat (ayu/concern_scan.py) */
  source?: string | null;
}) {
  const who = await requireOnStay(input.code, input.stayId, input.phone);
  const kind = (ROOM_CONCERN_KINDS as readonly string[]).includes(input.kind) ? input.kind : 'other';
  if (!String(input.summary ?? '').trim()) throw new RoomAyuError('Say briefly what the concern is.');
  return raiseConcern({
    stayId: who.stayId,
    level: input.level === 'serious' ? 'serious' : 'attention',
    kind: kind as (typeof ROOM_CONCERN_KINDS)[number],
    source: input.source === 'scan' ? 'scan' : 'ayu',
    skipIfOpen: input.source === 'scan',
    summary: String(input.summary),
    quote: input.quote ?? null,
    raisedByName: who.name,
    raisedByRole: who.role,
  });
}

/** How they rated their stay (1–5). Ratings of 1–2 also raise a concern. */
export async function feedbackFromRoom(input: { code: string; stayId: string; phone: string; rating: number; comment?: string | null }) {
  const who = await requireOnStay(input.code, input.stayId, input.phone);
  const rating = Math.round(Number(input.rating));
  if (!(rating >= 1 && rating <= 5)) throw new RoomAyuError('The rating must be 1 to 5.');
  return recordFeedback({ stayId: who.stayId, rating, comment: input.comment ?? null, byName: who.name, byRole: who.role });
}
