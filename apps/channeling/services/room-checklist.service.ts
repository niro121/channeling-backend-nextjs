import 'server-only';

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { ROOM_STAYS } from '@/lib/room-checklist-access';
import { isChecklistPhotoKey } from '@/lib/s3';
import { isValidMobile, normalizeMobile, MOBILE_VALIDATION_MESSAGE } from '@/lib/validations/phone';
import { createNotification } from '@/services/notification.service';
import { listRoomRequestsForStay } from '@/services/room-ayu.service';
import { listConcernsForStay, listFeedbackForStay, openConcernsByStay } from '@/services/room-concerns.service';
import { listInventoryRooms, setInventoryUnitsCondition } from '@/services/inventory.service';
import { INVENTORY_CONDITION } from '@/types/inventory';
import { REFERENCE_TYPES } from '@/types/notification';
import type { Permissions } from '@/types/user-group';
import {
  CHECKLIST_ITEM_TYPES,
  CHECKLIST_KINDS,
  CHECKLIST_KIND_LABEL,
  RETURNS_ITEM_ID,
  RETURNS_SECTION_ID,
  type ChecklistAnswer,
  type ChecklistForm,
  type ChecklistKind,
  type ChecklistScopeOptions,
  type ChecklistSection,
  type FormItem,
  type FormSection,
  type StayContactInput,
  type StayDetail,
  type StayPatientInput,
  type StayRoomRow,
  type StayRow,
  type StayStats,
  type StayStatus,
  type SubmissionIssue,
  type SubmissionRow,
  type TemplateInput,
  type TemplateRow,
  type TemplateStatus,
} from '@/types/room-checklist';

export class ChecklistError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_input' | 'not_found' | 'conflict' | 'needs_override' | 'forbidden' = 'invalid_input',
    readonly details?: unknown
  ) {
    super(message);
  }
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const trimmedOrNull = (max: number) =>
  z
    .string()
    .max(max, `Must be ${max} characters or fewer`)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new ChecklistError(r.error.issues[0]?.message ?? 'Invalid input');
  return r.data;
}

const shortId = () => randomUUID().replace(/-/g, '').slice(0, 12);

// ==== TEMPLATES ==== //

const itemSchema = z.object({
  id: z.string().trim().max(40).nullish(),
  type: z.enum(CHECKLIST_ITEM_TYPES),
  label: z.string().trim().min(1, 'Every item needs a label').max(200),
  help: trimmedOrNull(300),
  required: z.boolean().default(false),
  blocking: z.boolean().nullish(),
  evidenceOnFail: z.boolean().nullish(),
  defaultQty: z.number().int().min(0).max(999).nullish(),
});

const sectionSchema = z.object({
  id: z.string().trim().max(40).nullish(),
  title: z.string().trim().min(1, 'Every section needs a title').max(120),
  items: z.array(itemSchema).max(100, 'A section can hold up to 100 items'),
});

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  kind: z.enum(CHECKLIST_KINDS),
  appliesToAll: z.boolean().default(false),
  zoneIds: z.array(objectId).max(200).default([]),
  departmentIds: z.array(objectId).max(200).default([]),
  roomIds: z.array(objectId).max(1000).default([]),
  sections: z.array(sectionSchema).max(40, 'Up to 40 sections'),
});

/** Gives every section and item a stable id and drops flags that don't apply to its type. */
function normalizeSections(kind: ChecklistKind, sections: z.infer<typeof sectionSchema>[]): ChecklistSection[] {
  const seen = new Set<string>();
  const uniqueId = (id: string | null | undefined) => {
    let v = id && /^[a-zA-Z0-9_-]+$/.test(id) && !id.startsWith('__') ? id : shortId();
    while (seen.has(v)) v = shortId();
    seen.add(v);
    return v;
  };
  return sections.map((s) => ({
    id: uniqueId(s.id),
    title: s.title,
    items: s.items.map((i) => {
      if (i.type === 'handover' && kind !== 'check_in') {
        throw new ChecklistError(`"${i.label}": Handed to patient items belong on a check-in form.`);
      }
      const failable = i.type === 'tick' || i.type === 'pass_fail' || i.type === 'inventory';
      return {
        id: uniqueId(i.id),
        type: i.type,
        label: i.label,
        help: i.help ?? null,
        required: i.required,
        blocking: failable ? Boolean(i.blocking) : false,
        evidenceOnFail: i.type === 'pass_fail' || i.type === 'inventory' ? Boolean(i.evidenceOnFail) : false,
        defaultQty: i.type === 'handover' ? i.defaultQty ?? 1 : null,
      };
    }),
  }));
}

function sectionsOf(json: Prisma.JsonValue): ChecklistSection[] {
  return Array.isArray(json) ? (json as unknown as ChecklistSection[]) : [];
}

async function userNames(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (!unique.length) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

type TemplateRecord = Prisma.ChecklistTemplateGetPayload<object>;

function toTemplateRow(t: TemplateRecord, names: Map<string, string>): TemplateRow {
  const sections = sectionsOf(t.sections);
  return {
    id: t.id,
    name: t.name,
    kind: t.kind as ChecklistKind,
    status: t.status as TemplateStatus,
    version: t.version,
    appliesToAll: t.appliesToAll,
    zoneIds: t.zoneIds,
    departmentIds: t.departmentIds,
    roomIds: t.roomIds,
    sections,
    itemCount: sections.reduce((n, s) => n + s.items.length, 0),
    updatedAt: t.updatedAt.toISOString(),
    updatedByName: t.updatedBy ? names.get(t.updatedBy) ?? null : null,
  };
}

export async function listChecklistTemplates(): Promise<TemplateRow[]> {
  const rows = await prisma.checklistTemplate.findMany({ orderBy: [{ kind: 'asc' }, { updatedAt: 'desc' }] });
  const names = await userNames(rows.map((r) => r.updatedBy));
  return rows.map((r) => toTemplateRow(r, names));
}

export async function getChecklistTemplate(id: string): Promise<TemplateRow | null> {
  if (!OBJECT_ID.test(id)) return null;
  const row = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!row) return null;
  return toTemplateRow(row, await userNames([row.updatedBy]));
}

/** Zones, departments and rooms for the "applies to" picker. */
export async function listChecklistScopeOptions(): Promise<ChecklistScopeOptions> {
  const [zones, departments, rooms] = await Promise.all([
    prisma.zone.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { status: 1 }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    listInventoryRooms(null),
  ]);
  return {
    zones,
    departments,
    rooms: rooms.map((r) => ({
      id: r.id,
      name: `Room ${r.number}`,
      zoneId: r.zoneId,
      departmentId: r.departmentId,
      detail: [r.zoneName, r.departmentName].filter(Boolean).join(' · ') || null,
    })),
  };
}

function assertPublishable(t: { appliesToAll: boolean; zoneIds: string[]; departmentIds: string[]; roomIds: string[]; sections: ChecklistSection[] }) {
  if (!t.sections.some((s) => s.items.length > 0)) throw new ChecklistError('Add at least one item before publishing.');
  if (!t.appliesToAll && !t.zoneIds.length && !t.departmentIds.length && !t.roomIds.length) {
    throw new ChecklistError('Choose which rooms this form is for before publishing.');
  }
}

export async function saveChecklistTemplate(id: string | null, input: TemplateInput, userId: string): Promise<TemplateRow> {
  const data = parse(templateSchema, input);
  const sections = normalizeSections(data.kind, data.sections);
  const scope = {
    appliesToAll: data.appliesToAll,
    zoneIds: data.appliesToAll ? [] : data.zoneIds,
    departmentIds: data.appliesToAll ? [] : data.departmentIds,
    roomIds: data.appliesToAll ? [] : data.roomIds,
  };

  if (!id) {
    const row = await prisma.checklistTemplate.create({
      data: {
        name: data.name,
        kind: data.kind,
        status: 'draft',
        version: 1,
        ...scope,
        sections: sections as unknown as Prisma.InputJsonValue,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    return toTemplateRow(row, await userNames([userId]));
  }

  parse(objectId, id);
  const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!existing) throw new ChecklistError('Form not found.', 'not_found');
  if (existing.kind !== data.kind) throw new ChecklistError('A form cannot change between check-in and check-out.');
  if (existing.status === 'published') assertPublishable({ ...scope, sections });

  const row = await prisma.checklistTemplate.update({
    where: { id },
    data: {
      name: data.name,
      ...scope,
      sections: sections as unknown as Prisma.InputJsonValue,
      version: { increment: 1 },
      updatedBy: userId,
    },
  });
  return toTemplateRow(row, await userNames([userId]));
}

export async function setChecklistTemplateStatus(id: string, status: TemplateStatus, userId: string) {
  parse(objectId, id);
  if (!['draft', 'published', 'archived'].includes(status)) throw new ChecklistError('Invalid status');
  const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!existing) throw new ChecklistError('Form not found.', 'not_found');
  if (status === 'published') assertPublishable({ ...existing, sections: sectionsOf(existing.sections) });
  await prisma.checklistTemplate.update({ where: { id }, data: { status, updatedBy: userId } });
  return { name: existing.name, from: existing.status, to: status };
}

export async function duplicateChecklistTemplate(id: string, userId: string): Promise<TemplateRow> {
  parse(objectId, id);
  const t = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!t) throw new ChecklistError('Form not found.', 'not_found');
  const row = await prisma.checklistTemplate.create({
    data: {
      name: `${t.name} (copy)`.slice(0, 120),
      kind: t.kind,
      status: 'draft',
      version: 1,
      appliesToAll: t.appliesToAll,
      zoneIds: t.zoneIds,
      departmentIds: t.departmentIds,
      roomIds: t.roomIds,
      sections: t.sections as Prisma.InputJsonValue,
      createdBy: userId,
      updatedBy: userId,
    },
  });
  return toTemplateRow(row, await userNames([userId]));
}

/** Filled checklists keep their own copy of the form, so deleting never changes history. */
export async function deleteChecklistTemplate(id: string) {
  parse(objectId, id);
  const t = await prisma.checklistTemplate.findUnique({ where: { id }, select: { status: true, name: true } });
  if (!t) throw new ChecklistError('Form not found.', 'not_found');
  if (t.status === 'published') throw new ChecklistError('Archive the form before deleting it.');
  await prisma.checklistTemplate.delete({ where: { id } });
  return t.name;
}

// ==== WHICH FORM A ROOM USES ==== //

type RoomInfo = { id: string; number: string; zoneId: string | null; departmentId: string | null };

/** Most specific published form wins: room, then department, then zone, then "all rooms". */
async function resolveTemplate(room: RoomInfo, kind: ChecklistKind) {
  const candidates = await prisma.checklistTemplate.findMany({
    where: { kind, status: 'published' },
    orderBy: { updatedAt: 'desc' },
  });
  let best: (typeof candidates)[number] | null = null;
  let bestScore = 0;
  for (const t of candidates) {
    const score = t.roomIds.includes(room.id)
      ? 4
      : room.departmentId && t.departmentIds.includes(room.departmentId)
        ? 3
        : room.zoneId && t.zoneIds.includes(room.zoneId)
          ? 2
          : t.appliesToAll
            ? 1
            : 0;
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}

async function loadRoom(roomId: string): Promise<RoomInfo> {
  parse(objectId, roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, number: true, zoneId: true, departmentId: true },
  });
  if (!room) throw new ChecklistError('Room not found.', 'not_found');
  return room;
}

async function roomUnits(roomId: string) {
  const units = await prisma.inventoryUnit.findMany({
    where: { roomId, condition: { not: INVENTORY_CONDITION.disposed } },
    select: { id: true, assetTag: true, condition: true, item: { select: { name: true, icon: true } } },
  });
  return units
    .map((u) => ({ unitId: u.id, assetTag: u.assetTag, itemName: u.item.name, itemIcon: u.item.icon, condition: u.condition }))
    .sort((a, b) => a.itemName.localeCompare(b.itemName) || a.assetTag.localeCompare(b.assetTag, undefined, { numeric: true }));
}

/** Handed-over things recorded at check-in, to ask back at check-out. */
async function handedOver(stayId: string) {
  const checkIn = await prisma.checklistSubmission.findFirst({
    where: { stayId, kind: 'check_in' },
    orderBy: { submittedAt: 'desc' },
  });
  if (!checkIn) return [];
  const sections = sectionsOf(checkIn.templateSnapshot);
  const answers = new Map(((checkIn.answers as unknown as ChecklistAnswer[]) ?? []).map((a) => [a.itemId, a]));
  const rows: { key: string; label: string; givenQty: number }[] = [];
  for (const s of sections) {
    for (const i of s.items) {
      if (i.type !== 'handover') continue;
      const qty = Number(answers.get(i.id)?.qty ?? 0);
      if (qty > 0) rows.push({ key: i.id, label: i.label, givenQty: qty });
    }
  }
  return rows;
}

/** The form to fill for this room, with inventory units and returns filled in. */
export async function buildChecklistForm(roomId: string, kind: ChecklistKind, stayId?: string | null): Promise<ChecklistForm> {
  const room = await loadRoom(roomId);
  const template = await resolveTemplate(room, kind);
  const returns = kind === 'check_out' && stayId ? await handedOver(stayId) : [];

  // Check-in needs a form; check-out never blocks a patient from leaving, so it can run with no form.
  if (!template && kind === 'check_in') {
    throw new ChecklistError(
      `There is no published ${CHECKLIST_KIND_LABEL[kind].toLowerCase()} form for Room ${room.number}. Ask an admin to publish one.`,
      'not_found'
    );
  }

  const sections = template ? sectionsOf(template.sections) : [];
  const needsUnits = sections.some((s) => s.items.some((i) => i.type === 'inventory'));
  const units = needsUnits ? await roomUnits(room.id) : [];

  const formSections: FormSection[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    items: s.items.map((i): FormItem => (i.type === 'inventory' ? { ...i, units } : { ...i })),
  }));

  if (returns.length) {
    formSections.unshift({
      id: RETURNS_SECTION_ID,
      title: 'Items given at check-in',
      items: [
        {
          id: RETURNS_ITEM_ID,
          type: 'handover',
          label: 'Returned by the patient',
          help: 'Enter how many of each came back.',
          required: true,
          blocking: false,
          evidenceOnFail: true,
          returns,
        },
      ],
    });
  }

  return {
    templateId: template?.id ?? null,
    templateName: template?.name ?? (returns.length ? 'Return of items' : 'Check-out'),
    templateVersion: template?.version ?? 0,
    kind,
    room: { id: room.id, number: room.number },
    sections: formSections,
  };
}

// ==== CHECKING ANSWERS ==== //

const answerSchema = z.object({
  itemId: z.string().max(40),
  value: z.union([z.boolean(), z.number(), z.string().max(2000), z.null()]).optional(),
  note: trimmedOrNull(500),
  photos: z.array(z.string().max(300)).max(10).optional(),
  units: z
    .array(z.object({ unitId: objectId, state: z.enum(['present', 'missing', 'damaged']), note: trimmedOrNull(300) }))
    .max(500)
    .optional(),
  qty: z.number().int().min(0).max(999).nullish(),
  returns: z
    .array(z.object({ key: z.string().max(40), returnedQty: z.number().int().min(0).max(999), note: trimmedOrNull(300) }))
    .max(100)
    .optional(),
});

type Evaluation = {
  answers: ChecklistAnswer[];
  issues: SubmissionIssue[];
  /** Labels of blocking items that failed (needs Override). */
  blocking: string[];
  /** Units to mark in inventory. */
  missingUnitIds: string[];
  damagedUnitIds: string[];
};

/** Keeps only answers for items on the form, and works out problems and issues. Throws on anything not filled in. */
export function evaluateChecklistAnswers(form: ChecklistForm, rawAnswers: unknown): Evaluation {
  const list = parse(z.array(answerSchema).max(1000), Array.isArray(rawAnswers) ? rawAnswers : []);
  const byId = new Map(list.map((a) => [a.itemId, a]));
  const answers: ChecklistAnswer[] = [];
  const issues: SubmissionIssue[] = [];
  const blocking: string[] = [];
  const missingUnitIds: string[] = [];
  const damagedUnitIds: string[] = [];
  const problems: string[] = [];

  for (const section of form.sections) {
    for (const item of section.items) {
      const a = byId.get(item.id);
      const photos = (a?.photos ?? []).filter(isChecklistPhotoKey);
      const note = a?.note ?? null;
      const hasEvidence = Boolean(note) || photos.length > 0;
      const out: ChecklistAnswer = { itemId: item.id, note, photos };
      const where = section.title;
      const issue = (detail: string, topic?: string) =>
        issues.push({ sectionTitle: where, itemLabel: item.label, detail, topic: topic ?? item.label });

      switch (item.type) {
        case 'tick': {
          const ticked = a?.value === true;
          out.value = ticked;
          if (!ticked && item.required) {
            issue('Not ticked');
            if (item.blocking) blocking.push(item.label);
          }
          break;
        }
        case 'pass_fail': {
          const v = a?.value === 'pass' || a?.value === 'fail' ? a.value : null;
          out.value = v;
          if (!v && item.required) problems.push(`Choose Pass or Fail for "${item.label}".`);
          if (v === 'fail') {
            if (item.evidenceOnFail && !hasEvidence) problems.push(`Add a note or photo for "${item.label}".`);
            issue(note ? `Failed: ${note}` : 'Failed');
            if (item.blocking) blocking.push(item.label);
          }
          break;
        }
        case 'number': {
          const v = typeof a?.value === 'number' && Number.isFinite(a.value) ? a.value : null;
          out.value = v;
          if (v === null && item.required) problems.push(`Enter a number for "${item.label}".`);
          break;
        }
        case 'text': {
          const v = typeof a?.value === 'string' && a.value.trim() ? a.value.trim().slice(0, 2000) : null;
          out.value = v;
          if (!v && item.required) problems.push(`Fill in "${item.label}".`);
          break;
        }
        case 'photo': {
          if (!photos.length && item.required) problems.push(`Take a photo for "${item.label}".`);
          break;
        }
        case 'signature': {
          const v = isChecklistPhotoKey(a?.value) ? a.value : null;
          out.value = v;
          if (!v && item.required) problems.push(`Sign "${item.label}".`);
          break;
        }
        case 'inventory': {
          const given = new Map((a?.units ?? []).map((u) => [u.unitId, u]));
          out.units = [];
          let failed = false;
          for (const unit of item.units ?? []) {
            const u = given.get(unit.unitId);
            if (!u) {
              problems.push(`Check ${unit.itemName} ${unit.assetTag} in "${item.label}".`);
              continue;
            }
            out.units.push({ unitId: unit.unitId, state: u.state, note: u.note ?? null });
            if (u.state === 'present') continue;
            failed = true;
            if (item.evidenceOnFail && !u.note && !photos.length) {
              problems.push(`Add a note for ${unit.itemName} ${unit.assetTag}.`);
            }
            issue(`${unit.itemName} ${unit.assetTag} ${u.state}${u.note ? `: ${u.note}` : ''}`, `${unit.itemName} ${u.state}`);
            if (u.state === 'missing') missingUnitIds.push(unit.unitId);
            else damagedUnitIds.push(unit.unitId);
          }
          if (failed && item.blocking) blocking.push(item.label);
          break;
        }
        case 'handover': {
          if (item.returns) {
            const given = new Map((a?.returns ?? []).map((r) => [r.key, r]));
            out.returns = [];
            for (const r of item.returns) {
              const g = given.get(r.key);
              if (!g) {
                problems.push(`Enter how many "${r.label}" came back.`);
                continue;
              }
              const returnedQty = Math.min(g.returnedQty, 999);
              out.returns.push({ key: r.key, returnedQty, note: g.note ?? null });
              if (returnedQty < r.givenQty) {
                if (!g.note && !photos.length) problems.push(`Add a note for the missing "${r.label}".`);
                issue(`${r.label}: ${returnedQty} of ${r.givenQty} returned${g.note ? ` (${g.note})` : ''}`, `${r.label} not returned`);
              }
            }
          } else {
            const qty = typeof a?.qty === 'number' ? a.qty : null;
            out.qty = qty;
            if (qty === null && item.required) problems.push(`Enter how many "${item.label}" were given.`);
          }
          break;
        }
      }
      answers.push(out);
    }
  }

  if (problems.length) {
    throw new ChecklistError(problems[0], 'invalid_input', { problems });
  }
  return { answers, issues, blocking, missingUnitIds, damagedUnitIds };
}

// ==== STAYS ==== //

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required').max(120),
  phone: z
    .string()
    .transform((v) => normalizeMobile(v) ?? '')
    .refine((v) => isValidMobile(v), MOBILE_VALIDATION_MESSAGE),
  relationship: trimmedOrNull(60),
  isPrimary: z.boolean().default(false),
});

const contactsSchema = z.object({
  patientPhone: z
    .string()
    .nullish()
    .transform((v) => normalizeMobile(v))
    .refine((v) => v === null || isValidMobile(v), MOBILE_VALIDATION_MESSAGE),
  primaryIsPatient: z.boolean(),
  contacts: z.array(contactSchema).max(10, 'Up to 10 contacts'),
});

const patientSchema = contactsSchema.extend({
  patientName: z.string().trim().min(1, 'Patient name is required').max(120),
  bhtNumber: z.string().trim().min(1, 'BHT number is required').max(40),
});

function checkPrimary(data: z.infer<typeof contactsSchema>) {
  const primaries = data.contacts.filter((c) => c.isPrimary).length;
  if (data.primaryIsPatient) {
    if (!data.patientPhone) throw new ChecklistError("Enter the patient's phone number to make the patient the primary contact.");
    if (primaries) throw new ChecklistError('Only one primary contact is allowed.');
  } else if (primaries !== 1) {
    throw new ChecklistError(
      data.contacts.length ? 'Choose one primary contact.' : "Add a contact, or make the patient the primary contact."
    );
  }
}

function contactRows(stayId: string, contacts: StayContactInput[]) {
  return contacts.map((c, i) => ({
    stayId,
    name: c.name,
    phone: c.phone,
    relationship: c.relationship ?? null,
    isPrimary: Boolean(c.isPrimary),
    sortOrder: i,
  }));
}

export type ChecklistActor = { userId: string; permissions: Permissions | null; isAdmin: boolean; canOverride: boolean };

async function actorName(userId: string) {
  return (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? null;
}

function checkOverride(evaluation: Evaluation, overrideReason: string | null, actor: ChecklistActor) {
  if (!evaluation.blocking.length) return null;
  if (!overrideReason) {
    throw new ChecklistError(
      `These must pass before you can finish: ${evaluation.blocking.join(', ')}. Fix them, or ask someone with Override to sign off.`,
      'needs_override',
      { blocking: evaluation.blocking }
    );
  }
  if (!actor.canOverride) {
    throw new ChecklistError("You don't have permission to override failed items.", 'forbidden');
  }
  return overrideReason;
}

async function updateInventoryFromChecklist(evaluation: Evaluation, label: string, userId: string) {
  if (evaluation.missingUnitIds.length) {
    await setInventoryUnitsCondition(evaluation.missingUnitIds, INVENTORY_CONDITION.missing, `${label}: missing`, userId);
  }
  if (evaluation.damagedUnitIds.length) {
    await setInventoryUnitsCondition(evaluation.damagedUnitIds, INVENTORY_CONDITION.broken, `${label}: damaged`, userId);
  }
}

function submissionData(
  form: ChecklistForm,
  evaluation: Evaluation,
  extra: { stayId: string; roomId: string; userId: string; userName: string | null; overrideReason: string | null }
): Prisma.ChecklistSubmissionUncheckedCreateInput {
  return {
    kind: form.kind,
    templateId: form.templateId,
    templateName: form.templateName,
    templateVersion: form.templateVersion,
    templateSnapshot: form.sections as unknown as Prisma.InputJsonValue,
    answers: evaluation.answers as unknown as Prisma.InputJsonValue,
    hasIssues: evaluation.issues.length > 0,
    issueCount: evaluation.issues.length,
    issues: evaluation.issues as unknown as Prisma.InputJsonValue,
    overrideReason: extra.overrideReason,
    overrideBy: extra.overrideReason ? extra.userId : null,
    submittedBy: extra.userId,
    submittedByName: extra.userName,
    stayId: extra.stayId,
    roomId: extra.roomId,
  };
}

/** Users who asked for checklist issue alerts (room-stays.alerts in an active group). */
async function alertRecipients(excludeUserId: string) {
  const groups = await prisma.userGroup.findMany({ where: { status: 1 }, select: { id: true, permissions: true } });
  const groupIds = groups
    .filter((g) => hasPermission(g.permissions as unknown as Permissions, ROOM_STAYS, 'alerts'))
    .map((g) => g.id);
  if (!groupIds.length) return [];
  const users = await prisma.user.findMany({
    where: { userGroupId: { in: groupIds }, status: 1, id: { not: excludeUserId } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

async function notifyIssues(input: {
  stayId: string;
  kind: ChecklistKind;
  roomNumber: string;
  patientName: string;
  bhtNumber: string;
  issues: SubmissionIssue[];
  overridden: boolean;
  userId: string;
}) {
  if (!input.issues.length) return;
  try {
    const recipients = await alertRecipients(input.userId);
    const first = input.issues.slice(0, 3).map((i) => `${i.itemLabel}: ${i.detail}`).join('; ');
    const more = input.issues.length > 3 ? ` and ${input.issues.length - 3} more` : '';
    await Promise.all(
      recipients.map((userId) =>
        createNotification({
          userId,
          type: 'room_checklist_issue',
          title: `Room ${input.roomNumber}: ${CHECKLIST_KIND_LABEL[input.kind]} issues${input.overridden ? ' (overridden)' : ''}`,
          message: `${input.patientName} (BHT ${input.bhtNumber}). ${first}${more}`,
          referenceType: REFERENCE_TYPES.RoomStay,
          referenceId: input.stayId,
        })
      )
    );
  } catch (e) {
    console.error('[room-checklist] notify failed', e);
  }
}

export type SubmitResult = { stayId: string; issues: SubmissionIssue[] };

/** Creates the stay with its contacts and check-in checklist. One open stay per room. */
export async function checkInPatient(
  input: { roomId: string; patient: StayPatientInput; answers: unknown; overrideReason?: string | null },
  actor: ChecklistActor
): Promise<SubmitResult> {
  const patient = parse(patientSchema, input.patient);
  checkPrimary(patient);
  const overrideReason = parse(trimmedOrNull(300), input.overrideReason);
  const room = await loadRoom(input.roomId);

  const open = await prisma.roomStay.findFirst({ where: { roomId: room.id, status: 'occupied' }, select: { bhtNumber: true } });
  if (open) throw new ChecklistError(`Room ${room.number} already has a patient (BHT ${open.bhtNumber}).`, 'conflict');

  const form = await buildChecklistForm(room.id, 'check_in');
  const evaluation = evaluateChecklistAnswers(form, input.answers);
  const override = checkOverride(evaluation, overrideReason, actor);
  const userName = await actorName(actor.userId);

  const stay = await prisma.roomStay.create({
    data: {
      roomId: room.id,
      patientName: patient.patientName,
      bhtNumber: patient.bhtNumber,
      patientPhone: patient.patientPhone,
      primaryIsPatient: patient.primaryIsPatient,
      status: 'occupied',
      checkedInBy: actor.userId,
      hasIssues: evaluation.issues.length > 0,
    },
    select: { id: true, createdAt: true },
  });

  // Two GROs checking in the same room at once: the later one backs out.
  const openNow = await prisma.roomStay.findMany({
    where: { roomId: room.id, status: 'occupied' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, bhtNumber: true },
  });
  if (openNow.length > 1 && openNow[0].id !== stay.id) {
    await prisma.roomStay.delete({ where: { id: stay.id } });
    throw new ChecklistError(`Room ${room.number} was just checked in (BHT ${openNow[0].bhtNumber}).`, 'conflict');
  }

  try {
    await prisma.$transaction([
      // MongoDB rejects an empty createMany, and the patient can be the only contact.
      ...(patient.contacts.length ? [prisma.roomStayContact.createMany({ data: contactRows(stay.id, patient.contacts) })] : []),
      prisma.checklistSubmission.create({
        data: submissionData(form, evaluation, { stayId: stay.id, roomId: room.id, userId: actor.userId, userName, overrideReason: override }),
      }),
    ]);
  } catch (e) {
    await prisma.roomStay.delete({ where: { id: stay.id } }).catch(() => undefined);
    throw e;
  }

  await updateInventoryFromChecklist(evaluation, `Check-in BHT ${patient.bhtNumber}`, actor.userId);
  await notifyIssues({
    stayId: stay.id,
    kind: 'check_in',
    roomNumber: room.number,
    patientName: patient.patientName,
    bhtNumber: patient.bhtNumber,
    issues: evaluation.issues,
    overridden: Boolean(override),
    userId: actor.userId,
  });
  return { stayId: stay.id, issues: evaluation.issues };
}

async function loadOpenStay(stayId: string) {
  parse(objectId, stayId);
  const stay = await prisma.roomStay.findUnique({
    where: { id: stayId },
    select: { id: true, roomId: true, status: true, patientName: true, bhtNumber: true, hasIssues: true, room: { select: { number: true } } },
  });
  if (!stay) throw new ChecklistError('Stay not found.', 'not_found');
  if (stay.status !== 'occupied') throw new ChecklistError('This patient has already been checked out.', 'conflict');
  return stay;
}

export async function checkOutPatient(
  stayId: string,
  input: { answers: unknown; overrideReason?: string | null },
  actor: ChecklistActor
): Promise<SubmitResult> {
  const stay = await loadOpenStay(stayId);
  const overrideReason = parse(trimmedOrNull(300), input.overrideReason);
  const form = await buildChecklistForm(stay.roomId, 'check_out', stay.id);
  const evaluation = evaluateChecklistAnswers(form, input.answers);
  const override = checkOverride(evaluation, overrideReason, actor);
  const userName = await actorName(actor.userId);

  // Close first, guarded on status, so two check-outs can't both go through.
  const closed = await prisma.roomStay.updateMany({
    where: { id: stay.id, status: 'occupied' },
    data: {
      status: 'closed',
      checkedOutAt: new Date(),
      checkedOutBy: actor.userId,
      hasIssues: stay.hasIssues || evaluation.issues.length > 0,
    },
  });
  if (closed.count !== 1) throw new ChecklistError('This patient has already been checked out.', 'conflict');

  try {
    await prisma.checklistSubmission.create({
      data: submissionData(form, evaluation, { stayId: stay.id, roomId: stay.roomId, userId: actor.userId, userName, overrideReason: override }),
    });
  } catch (e) {
    await prisma.roomStay.update({
      where: { id: stay.id },
      data: { status: 'occupied', checkedOutAt: null, checkedOutBy: null, hasIssues: stay.hasIssues },
    });
    throw e;
  }

  await updateInventoryFromChecklist(evaluation, `Check-out BHT ${stay.bhtNumber}`, actor.userId);
  await notifyIssues({
    stayId: stay.id,
    kind: 'check_out',
    roomNumber: stay.room.number,
    patientName: stay.patientName,
    bhtNumber: stay.bhtNumber,
    issues: evaluation.issues,
    overridden: Boolean(override),
    userId: actor.userId,
  });
  return { stayId: stay.id, issues: evaluation.issues };
}

/** Replace the contacts and primary of an open stay. */
export async function updateStayContacts(
  stayId: string,
  input: { patientPhone?: string | null; primaryIsPatient: boolean; contacts: StayContactInput[] }
) {
  const stay = await loadOpenStay(stayId);
  const data = parse(contactsSchema, input);
  checkPrimary(data);
  await prisma.$transaction([
    prisma.roomStayContact.deleteMany({ where: { stayId: stay.id } }),
    ...(data.contacts.length ? [prisma.roomStayContact.createMany({ data: contactRows(stay.id, data.contacts) })] : []),
    prisma.roomStay.update({
      where: { id: stay.id },
      data: { patientPhone: data.patientPhone, primaryIsPatient: data.primaryIsPatient },
    }),
  ]);
  return { bhtNumber: stay.bhtNumber, count: data.contacts.length };
}

/** A check-in made by mistake. Frees the room; the check-in checklist stays on record. */
export async function cancelStay(stayId: string, reason: string, userId: string) {
  const stay = await loadOpenStay(stayId);
  const why = parse(z.string().trim().min(3, 'Give a reason').max(300), reason);
  await prisma.roomStay.update({
    where: { id: stay.id },
    data: { status: 'cancelled', cancelReason: why, checkedOutAt: new Date(), checkedOutBy: userId },
  });
  return { bhtNumber: stay.bhtNumber, roomNumber: stay.room.number };
}

// ==== READS ==== //

/** Rooms of a branch with their open stay, for the PWA. */
export async function listStayRooms(locationId: string | null): Promise<StayRoomRow[]> {
  const rooms = await listInventoryRooms(locationId);
  const stays = rooms.length
    ? await prisma.roomStay.findMany({
        where: { status: 'occupied', roomId: { in: rooms.map((r) => r.id) } },
        select: { id: true, roomId: true, patientName: true, bhtNumber: true, checkedInAt: true, hasIssues: true },
      })
    : [];
  const byRoom = new Map(stays.map((s) => [s.roomId, s]));
  const open = stays.length
    ? await prisma.roomRequest.groupBy({
        by: ['stayId'],
        where: { stayId: { in: stays.map((s) => s.id) }, status: { in: ['new', 'in_progress'] } },
        _count: { _all: true },
      })
    : [];
  const openByStay = new Map(open.map((o) => [o.stayId, o._count._all]));
  const concerns = await openConcernsByStay(stays.map((s) => s.id));
  return rooms.map((r) => {
    const s = byRoom.get(r.id);
    return {
      ...r,
      stay: s
        ? {
            id: s.id,
            patientName: s.patientName,
            bhtNumber: s.bhtNumber,
            checkedInAt: s.checkedInAt.toISOString(),
            hasIssues: s.hasIssues,
            openRequests: openByStay.get(s.id) ?? 0,
            openConcerns: concerns.get(s.id)?.open ?? 0,
            seriousConcern: concerns.get(s.id)?.serious ?? false,
          }
        : null,
    };
  });
}

const DAY_MS = 86_400_000;

/** Midnight in Sri Lanka (UTC+5:30), `daysBack` days ago, as a UTC Date. */
function colomboMidnight(daysBack = 0): Date {
  const offset = 330 * 60_000;
  const local = new Date(Date.now() + offset);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offset - daysBack * DAY_MS);
}

/** Room statistics for one branch. `days` 1 = today, 7 or 30 = including today. */
export async function getStayStats(locationId: string | null, days: number): Promise<StayStats> {
  const period = [1, 7, 30].includes(days) ? days : 1;
  const since = colomboMidnight(period - 1);
  const rooms = await listStayRooms(locationId);
  const roomIds = rooms.map((r) => r.id);
  const inRooms = { roomId: { in: roomIds } };

  const [checkIns, closed, subs] = roomIds.length
    ? await Promise.all([
        prisma.roomStay.count({ where: { ...inRooms, status: { not: 'cancelled' }, checkedInAt: { gte: since } } }),
        prisma.roomStay.findMany({
          where: { ...inRooms, status: 'closed', checkedOutAt: { gte: since } },
          select: { checkedInAt: true, checkedOutAt: true },
        }),
        prisma.checklistSubmission.findMany({
          where: { ...inRooms, submittedAt: { gte: since } },
          select: { hasIssues: true, overrideReason: true, issues: true },
        }),
      ])
    : [0, [], []];

  const issueCounts = new Map<string, number>();
  for (const s of subs) {
    for (const i of (s.issues as unknown as SubmissionIssue[] | null) ?? []) {
      const topic = i.topic ?? i.itemLabel;
      issueCounts.set(topic, (issueCounts.get(topic) ?? 0) + 1);
    }
  }
  const lengths = closed.filter((s) => s.checkedOutAt).map((s) => (s.checkedOutAt!.getTime() - s.checkedInAt.getTime()) / DAY_MS);

  const zones = new Map<string, { name: string; total: number; inRoom: number }>();
  for (const r of rooms) {
    const key = r.zoneId ?? 'none';
    const z = zones.get(key) ?? { name: r.zoneName ?? 'No zone', total: 0, inRoom: 0 };
    z.total++;
    if (r.stay) z.inRoom++;
    zones.set(key, z);
  }

  const inRoom = rooms.filter((r) => r.stay).length;
  return {
    days: period,
    now: {
      total: rooms.length,
      inRoom,
      free: rooms.length - inRoom,
      occupancyPct: rooms.length ? Math.round((inRoom / rooms.length) * 100) : 0,
      openIssues: rooms.filter((r) => r.stay?.hasIssues).length,
    },
    period: {
      checkIns,
      checkOuts: closed.length,
      avgStayDays: lengths.length ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10 : null,
      checklists: subs.length,
      checklistsWithIssues: subs.filter((s) => s.hasIssues).length,
      overrides: subs.filter((s) => s.overrideReason).length,
    },
    byZone: [...zones.values()].sort((a, b) => b.inRoom / (b.total || 1) - a.inRoom / (a.total || 1) || a.name.localeCompare(b.name)),
    topIssues: [...issueCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([label, count]) => ({ label, count })),
    longestStays: rooms
      .filter((r) => r.stay)
      .sort((a, b) => a.stay!.checkedInAt.localeCompare(b.stay!.checkedInAt))
      .slice(0, 5)
      .map((r) => ({
        stayId: r.stay!.id,
        roomNumber: r.number,
        patientName: r.stay!.patientName,
        bhtNumber: r.stay!.bhtNumber,
        days: Math.floor((Date.now() - new Date(r.stay!.checkedInAt).getTime()) / DAY_MS),
      })),
  };
}

const staySelect = {
  id: true,
  roomId: true,
  patientName: true,
  bhtNumber: true,
  patientPhone: true,
  primaryIsPatient: true,
  status: true,
  checkedInAt: true,
  checkedInBy: true,
  checkedOutAt: true,
  checkedOutBy: true,
  hasIssues: true,
  cancelReason: true,
  room: { select: { number: true, zone: { select: { name: true } }, department: { select: { name: true } } } },
  contacts: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, phone: true, relationship: true, isPrimary: true } },
} satisfies Prisma.RoomStaySelect;

type StayRecord = Prisma.RoomStayGetPayload<{ select: typeof staySelect }>;

function toStayRow(s: StayRecord, names: Map<string, string>, concerns?: Map<string, { open: number; serious: boolean }>): StayRow {
  return {
    id: s.id,
    roomId: s.roomId,
    roomNumber: s.room.number,
    zoneName: s.room.zone?.name ?? null,
    departmentName: s.room.department?.name ?? null,
    patientName: s.patientName,
    bhtNumber: s.bhtNumber,
    patientPhone: s.patientPhone,
    primaryIsPatient: s.primaryIsPatient,
    status: s.status as StayStatus,
    checkedInAt: s.checkedInAt.toISOString(),
    checkedInByName: s.checkedInBy ? names.get(s.checkedInBy) ?? null : null,
    checkedOutAt: s.checkedOutAt?.toISOString() ?? null,
    checkedOutByName: s.checkedOutBy ? names.get(s.checkedOutBy) ?? null : null,
    hasIssues: s.hasIssues,
    contacts: s.contacts,
    openConcerns: concerns?.get(s.id)?.open ?? 0,
    seriousConcern: concerns?.get(s.id)?.serious ?? false,
  };
}

export async function listStays(filter: {
  status?: string | null;
  q?: string | null;
  issuesOnly?: boolean;
  from?: Date | null;
  to?: Date | null;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: StayRow[]; total: number }> {
  const pageSize = Math.min(Math.max(filter.pageSize ?? 25, 1), 100);
  const page = Math.max(filter.page ?? 1, 1);
  const where: Prisma.RoomStayWhereInput = {};
  if (filter.status && ['occupied', 'closed', 'cancelled'].includes(filter.status)) where.status = filter.status;
  if (filter.issuesOnly) where.hasIssues = true;
  if (filter.from || filter.to) {
    where.checkedInAt = { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) };
  }
  const q = filter.q?.trim();
  if (q) {
    const rooms = await prisma.room.findMany({ where: { number: { contains: q, mode: 'insensitive' } }, select: { id: true } });
    where.OR = [
      { bhtNumber: { contains: q, mode: 'insensitive' } },
      { patientName: { contains: q, mode: 'insensitive' } },
      ...(rooms.length ? [{ roomId: { in: rooms.map((r) => r.id) } }] : []),
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.roomStay.findMany({
      where,
      orderBy: { checkedInAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: staySelect,
    }),
    prisma.roomStay.count({ where }),
  ]);
  const [names, concerns] = await Promise.all([
    userNames(rows.flatMap((r) => [r.checkedInBy, r.checkedOutBy])),
    openConcernsByStay(rows.map((r) => r.id)),
  ]);
  return { rows: rows.map((r) => toStayRow(r, names, concerns)), total };
}

export async function getStayDetail(stayId: string): Promise<StayDetail | null> {
  if (!OBJECT_ID.test(stayId)) return null;
  const stay = await prisma.roomStay.findUnique({ where: { id: stayId }, select: staySelect });
  if (!stay) return null;
  const subs = await prisma.checklistSubmission.findMany({ where: { stayId }, orderBy: { submittedAt: 'asc' } });
  const names = await userNames([stay.checkedInBy, stay.checkedOutBy, ...subs.map((s) => s.overrideBy)]);
  const submissions: SubmissionRow[] = subs.map((s) => ({
    id: s.id,
    kind: s.kind as ChecklistKind,
    templateName: s.templateName,
    templateVersion: s.templateVersion,
    sections: s.templateSnapshot as unknown as FormSection[],
    answers: s.answers as unknown as ChecklistAnswer[],
    hasIssues: s.hasIssues,
    issues: (s.issues as unknown as SubmissionIssue[] | null) ?? [],
    overrideReason: s.overrideReason,
    overrideByName: s.overrideBy ? names.get(s.overrideBy) ?? null : null,
    submittedAt: s.submittedAt.toISOString(),
    submittedByName: s.submittedByName,
  }));
  const [requests, concerns, feedback, open] = await Promise.all([
    listRoomRequestsForStay(stay.id),
    listConcernsForStay(stay.id),
    listFeedbackForStay(stay.id),
    openConcernsByStay([stay.id]),
  ]);
  return { ...toStayRow(stay, names, open), cancelReason: stay.cancelReason, submissions, requests, concerns, feedback };
}

/** Photo keys used by a stay's checklists, so a photo is only served to people who can see that stay. */
export async function stayPhotoKeys(stayId: string): Promise<Set<string>> {
  if (!OBJECT_ID.test(stayId)) return new Set();
  const subs = await prisma.checklistSubmission.findMany({ where: { stayId }, select: { answers: true } });
  const keys = new Set<string>();
  for (const s of subs) {
    for (const a of (s.answers as unknown as ChecklistAnswer[]) ?? []) {
      for (const k of a.photos ?? []) keys.add(k);
      if (typeof a.value === 'string' && isChecklistPhotoKey(a.value)) keys.add(a.value);
    }
  }
  return keys;
}
