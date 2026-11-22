import 'server-only';

import prisma from '@/lib/prisma';
import { getStayDetail, getStayStats, listStays } from '@/services/room-checklist.service';
import { CHECKLIST_KIND_LABEL, type ChecklistKind, type SubmissionIssue } from '@/types/room-checklist';

/**
 * Read-only lookups for Ayu in the management app (api/management/ai/*). Shapes are small and
 * plain so the model can read them; patient phone numbers only come from stayContacts.
 */

const DAY_MS = 86_400_000;
const colombo = (d: Date | null) =>
  d ? d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }) : null;
const daysSince = (d: Date) => Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY_MS));

/** Patients in a room now, across every branch. `query` matches room, zone, department, name or BHT. */
export async function currentStays(input: { query?: string | null; issuesOnly?: boolean }) {
  const stays = await prisma.roomStay.findMany({
    where: { status: 'occupied', ...(input.issuesOnly ? { hasIssues: true } : {}) },
    orderBy: { checkedInAt: 'asc' },
    select: {
      id: true,
      patientName: true,
      bhtNumber: true,
      checkedInAt: true,
      hasIssues: true,
      room: {
        select: {
          number: true,
          zone: { select: { name: true } },
          department: { select: { name: true } },
          location: { select: { name: true } },
        },
      },
    },
  });
  const q = input.query?.trim().toLowerCase();
  const rows = stays
    .map((s) => ({
      stayId: s.id,
      room: s.room.number,
      zone: s.room.zone?.name ?? null,
      department: s.room.department?.name ?? null,
      branch: s.room.location?.name ?? null,
      patientName: s.patientName,
      bhtNumber: s.bhtNumber,
      checkedIn: colombo(s.checkedInAt),
      daysInRoom: daysSince(s.checkedInAt),
      hasOpenIssues: s.hasIssues,
    }))
    .filter(
      (r) =>
        !q ||
        [r.room, r.zone, r.department, r.branch, r.patientName, r.bhtNumber].some((v) => v?.toLowerCase().includes(q))
    );
  return { count: rows.length, stays: rows.slice(0, 100), truncated: rows.length > 100 };
}

function issueLines(issues: SubmissionIssue[]) {
  return issues.map((i) => `${i.itemLabel}: ${i.detail}`);
}

/** Stays matching a BHT number, patient name or room (newest first), with their checklists' outcome. */
export async function findStays(query: string) {
  const q = query.trim();
  if (!q) return { count: 0, stays: [] };
  const { rows } = await listStays({ q, pageSize: 5 });
  const stays = await Promise.all(
    rows.map(async (r) => {
      const d = await getStayDetail(r.id);
      return {
        stayId: r.id,
        room: r.roomNumber,
        zone: r.zoneName,
        department: r.departmentName,
        patientName: r.patientName,
        bhtNumber: r.bhtNumber,
        status: r.status === 'occupied' ? 'in room' : r.status === 'closed' ? 'checked out' : 'check-in cancelled',
        checkedIn: colombo(new Date(r.checkedInAt)),
        checkedInBy: r.checkedInByName,
        checkedOut: r.checkedOutAt ? colombo(new Date(r.checkedOutAt)) : null,
        checkedOutBy: r.checkedOutByName,
        cancelReason: d?.cancelReason ?? null,
        checklists: (d?.submissions ?? []).map((s) => ({
          kind: CHECKLIST_KIND_LABEL[s.kind as ChecklistKind],
          form: s.templateName,
          submitted: colombo(new Date(s.submittedAt)),
          by: s.submittedByName,
          result: s.hasIssues ? `${s.issues.length} issue(s)` : 'all clear',
          issues: issueLines(s.issues),
          overriddenBecause: s.overrideReason,
        })),
        contactsOnFile: r.contacts.length + (r.patientPhone ? 1 : 0),
      };
    })
  );
  return { count: stays.length, stays };
}

/** Checklists submitted with issues in the last `days` days (newest first). */
export async function recentIssues(days: number) {
  const span = Math.min(Math.max(Math.trunc(days) || 7, 1), 90);
  const subs = await prisma.checklistSubmission.findMany({
    where: { hasIssues: true, submittedAt: { gte: new Date(Date.now() - span * DAY_MS) } },
    orderBy: { submittedAt: 'desc' },
    take: 50,
    select: {
      kind: true,
      submittedAt: true,
      submittedByName: true,
      overrideReason: true,
      issues: true,
      stay: { select: { id: true, patientName: true, bhtNumber: true, status: true, room: { select: { number: true } } } },
    },
  });
  return {
    days: span,
    count: subs.length,
    checklists: subs.map((s) => ({
      stayId: s.stay.id,
      room: s.stay.room.number,
      patientName: s.stay.patientName,
      bhtNumber: s.stay.bhtNumber,
      patientStillInRoom: s.stay.status === 'occupied',
      kind: CHECKLIST_KIND_LABEL[s.kind as ChecklistKind],
      submitted: colombo(s.submittedAt),
      by: s.submittedByName,
      issues: issueLines((s.issues as unknown as SubmissionIssue[] | null) ?? []),
      overriddenBecause: s.overrideReason,
    })),
  };
}

/** Occupancy and activity per branch. `days`: 1 = today, 7 or 30. */
export async function roomStatistics(days: number) {
  const period = [1, 7, 30].includes(days) ? days : days > 7 ? 30 : days > 1 ? 7 : 1;
  const locations = await prisma.location.findMany({
    where: { status: 1, rooms: { some: {} } },
    select: { id: true, name: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
  const branches = await Promise.all(
    locations.map(async (l) => {
      const s = await getStayStats(l.id, period);
      return {
        branch: l.name,
        roomsInUse: s.now.inRoom,
        rooms: s.now.total,
        occupancyPercent: s.now.occupancyPct,
        freeRooms: s.now.free,
        patientsWithOpenIssues: s.now.openIssues,
        checkIns: s.period.checkIns,
        checkOuts: s.period.checkOuts,
        averageStayDays: s.period.avgStayDays,
        checklistsWithIssues: `${s.period.checklistsWithIssues} of ${s.period.checklists}`,
        overrides: s.period.overrides,
        mostCommonIssues: s.topIssues.map((i) => `${i.label} (${i.count})`),
        occupancyByZone: s.byZone.map((z) => `${z.name}: ${z.inRoom}/${z.total}`),
        longestCurrentStays: s.longestStays.map((x) => `Room ${x.roomNumber}, ${x.patientName} (BHT ${x.bhtNumber}), ${x.days} day(s)`),
      };
    })
  );
  return { period: period === 1 ? 'today' : `last ${period} days`, branches };
}

/** Contacts for stays matching a BHT number, patient name or room; patients still in a room first. */
export async function stayContacts(query: string) {
  const q = query.trim();
  if (!q) return { count: 0, stays: [] };
  const { rows } = await listStays({ q, pageSize: 5 });
  rows.sort((a, b) => Number(b.status === 'occupied') - Number(a.status === 'occupied'));
  return {
    count: rows.length,
    stays: rows.map((r) => ({
      room: r.roomNumber,
      patientName: r.patientName,
      bhtNumber: r.bhtNumber,
      status: r.status === 'occupied' ? 'in room' : r.status === 'closed' ? 'checked out' : 'check-in cancelled',
      patientPhone: r.patientPhone,
      primaryContact: r.primaryIsPatient
        ? `the patient (${r.patientPhone ?? 'no phone'})`
        : (() => {
            const p = r.contacts.find((c) => c.isPrimary);
            return p ? `${p.name}${p.relationship ? ` (${p.relationship})` : ''}, ${p.phone}` : 'none recorded';
          })(),
      contacts: r.contacts.map((c) => ({
        name: c.name,
        relationship: c.relationship,
        phone: c.phone,
        primary: c.isPrimary,
      })),
    })),
  };
}
