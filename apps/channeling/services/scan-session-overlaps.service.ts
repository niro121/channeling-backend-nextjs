import prisma from '@/lib/prisma';
import {
  doctorSessionTimesOverlap,
  formatSriLankaClock,
  sharedDayLabel,
  sriLankaMinutes,
  timeRangesOverlap
} from '@/lib/doctor-session-overlap';
import { formatDateTimeSriLanka } from '@/lib/utils';
import type {
  DoctorSessionOverlapScan,
  GeneratedOverlapScan,
  OverlapGroup,
  OverlapPair,
  OverlapSide
} from '@/types/session-overlaps';
import moment from 'moment';

const MAX_GENERATED_RANGE_DAYS = 120;

export type {
  DoctorSessionOverlapScan,
  GeneratedOverlapScan,
  OverlapGroup,
  OverlapPair,
  OverlapSide
} from '@/types/session-overlaps';

function sideFromDoctorSession(row: {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  status: number;
}): OverlapSide {
  const startMinutes = sriLankaMinutes(row.startTime);
  const endMinutes = sriLankaMinutes(row.endTime);
  return {
    id: row.id,
    name: row.name?.trim() || 'Session',
    timeLabel: `${formatSriLankaClock(row.startTime)} – ${formatSriLankaClock(row.endTime)}`,
    detail: row.status === 1 ? 'Published' : 'Unpublished',
    startMinutes,
    endMinutes,
    status: row.status
  };
}

function earlierFirst(a: OverlapSide, b: OverlapSide): [OverlapSide, OverlapSide] {
  if (a.startMinutes < b.startMinutes) return [a, b];
  if (b.startMinutes < a.startMinutes) return [b, a];
  return a.name.localeCompare(b.name) <= 0 ? [a, b] : [b, a];
}

export async function scanDoctorSessionOverlaps(): Promise<DoctorSessionOverlapScan> {
  const rows = await prisma.doctorSession.findMany({
    select: {
      id: true,
      name: true,
      dayType: true,
      applyTo: true,
      startTime: true,
      endTime: true,
      status: true,
      doctorId: true,
      locationId: true,
      doctor: { select: { name: true } },
      location: { select: { name: true } }
    }
  });

  const byDoctorBranch = new Map<string, typeof rows>();
  const doctorIds = new Set<string>();

  for (const row of rows) {
    if (!row.doctorId) continue;
    doctorIds.add(row.doctorId);
    const key = `${row.doctorId}::${row.locationId ?? ''}`;
    const list = byDoctorBranch.get(key);
    if (list) list.push(row);
    else byDoctorBranch.set(key, [row]);
  }

  const groups: OverlapGroup[] = [];

  for (const bucket of byDoctorBranch.values()) {
    if (bucket.length < 2) continue;
    const pairs: OverlapPair[] = [];

    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];
        if (!doctorSessionTimesOverlap(a, b)) continue;
        const [left, right] = earlierFirst(sideFromDoctorSession(a), sideFromDoctorSession(b));
        pairs.push({
          dayLabel: sharedDayLabel(a, b),
          left,
          right
        });
      }
    }

    if (!pairs.length) continue;
    const sample = bucket[0];
    pairs.sort((x, y) => x.dayLabel.localeCompare(y.dayLabel) || x.left.startMinutes - y.left.startMinutes);
    groups.push({
      doctorId: sample.doctorId ?? '',
      doctorName: sample.doctor?.name?.trim() || 'Unknown doctor',
      locationId: sample.locationId ?? '',
      locationName: sample.location?.name?.trim() || 'No branch',
      pairs
    });
  }

  groups.sort(
    (a, b) => a.doctorName.localeCompare(b.doctorName) || a.locationName.localeCompare(b.locationName)
  );

  return {
    groups,
    sessionsScanned: rows.length,
    doctorsScanned: doctorIds.size,
    pairCount: groups.reduce((sum, group) => sum + group.pairs.length, 0)
  };
}

export async function scanGeneratedSessionOverlaps(
  fromDate: string,
  toDate: string
): Promise<{ success: true; data: GeneratedOverlapScan } | { success: false; message: string }> {
  const from = moment.utc(fromDate, 'YYYY-MM-DD', true);
  const to = moment.utc(toDate, 'YYYY-MM-DD', true);
  if (!from.isValid() || !to.isValid()) {
    return { success: false, message: 'Enter a valid from and to date.' };
  }
  if (to.isBefore(from, 'day')) {
    return { success: false, message: 'To date must be on or after from date.' };
  }
  const daySpan = to.diff(from, 'days') + 1;
  if (daySpan > MAX_GENERATED_RANGE_DAYS) {
    return {
      success: false,
      message: `Choose a range of ${MAX_GENERATED_RANGE_DAYS} days or less.`
    };
  }

  const rows = await prisma.session.findMany({
    where: {
      date: {
        gte: from.clone().startOf('day').toDate(),
        lte: to.clone().endOf('day').toDate()
      }
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      maxPatientNumber: true,
      doctorId: true,
      locationId: true,
      doctorSessionId: true,
      doctor: { select: { name: true } },
      location: { select: { name: true } }
    }
  });

  const templateIds = [...new Set(rows.map((row) => row.doctorSessionId).filter(Boolean))];
  const templates =
    templateIds.length > 0
      ? await prisma.doctorSession.findMany({
          where: { id: { in: templateIds } },
          select: { id: true, name: true }
        })
      : [];
  const templateNames = new Map(templates.map((template) => [template.id, template.name]));

  const doctorIds = new Set<string>();
  const bySlot = new Map<string, typeof rows>();

  for (const row of rows) {
    if (!row.doctorId) continue;
    doctorIds.add(row.doctorId);
    const dateKey = moment.utc(row.date).format('YYYY-MM-DD');
    const key = `${row.doctorId}::${row.locationId ?? ''}::${dateKey}`;
    const list = bySlot.get(key);
    if (list) list.push(row);
    else bySlot.set(key, [row]);
  }

  const groups: OverlapGroup[] = [];
  const pendingPairs: {
    dateLabel: string;
    a: (typeof rows)[number];
    b: (typeof rows)[number];
    aStart: number;
    aEnd: number;
    bStart: number;
    bEnd: number;
  }[] = [];

  for (const bucket of bySlot.values()) {
    if (bucket.length < 2) continue;
    const dateLabel = moment.utc(bucket[0].date).format('ddd, D MMM YYYY');

    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];
        const aStart = sriLankaMinutes(a.startTime);
        const aEnd = sriLankaMinutes(a.endTime);
        const bStart = sriLankaMinutes(b.startTime);
        const bEnd = sriLankaMinutes(b.endTime);
        if (aEnd <= aStart || bEnd <= bStart) continue;
        if (!timeRangesOverlap(aStart, aEnd, bStart, bEnd)) continue;
        pendingPairs.push({ dateLabel, a, b, aStart, aEnd, bStart, bEnd });
      }
    }
  }

  const overlapIds = [...new Set(pendingPairs.flatMap((pair) => [pair.a.id, pair.b.id]))];
  const appointmentCountBySession = new Map<string, number>();
  if (overlapIds.length > 0) {
    const countRows = await prisma.booking.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { in: overlapIds },
        status: { in: [0, 1] }
      },
      _count: { id: true }
    });
    for (const row of countRows) {
      if (row.sessionId) appointmentCountBySession.set(row.sessionId, row._count.id);
    }
  }

  const pairsBySlot = new Map<string, OverlapPair[]>();
  const slotSample = new Map<string, (typeof rows)[number]>();

  for (const pair of pendingPairs) {
    const toSide = (
      row: (typeof rows)[number],
      startMinutes: number,
      endMinutes: number
    ): OverlapSide => ({
      id: row.id,
      name: templateNames.get(row.doctorSessionId)?.trim() || 'Session',
      timeLabel: `${formatSriLankaClock(row.startTime)} – ${formatSriLankaClock(row.endTime)}`,
      appointmentCount: appointmentCountBySession.get(row.id) ?? 0,
      generatedLabel: formatDateTimeSriLanka(row.createdAt),
      onLeave: row.status === 0,
      startMinutes,
      endMinutes,
      status: row.status,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      maxPatientNumber: row.maxPatientNumber
    });

    const [left, right] = earlierFirst(
      toSide(pair.a, pair.aStart, pair.aEnd),
      toSide(pair.b, pair.bStart, pair.bEnd)
    );
    const slotKey = `${pair.a.doctorId}::${pair.a.locationId ?? ''}::${pair.dateLabel}`;
    const list = pairsBySlot.get(slotKey);
    const overlapPair: OverlapPair = { dayLabel: pair.dateLabel, left, right };
    if (list) list.push(overlapPair);
    else pairsBySlot.set(slotKey, [overlapPair]);
    if (!slotSample.has(slotKey)) slotSample.set(slotKey, pair.a);
  }

  for (const [slotKey, pairs] of pairsBySlot) {
    const sample = slotSample.get(slotKey);
    if (!sample || !pairs.length) continue;
    pairs.sort((x, y) => x.left.startMinutes - y.left.startMinutes);
    groups.push({
      doctorId: sample.doctorId ?? '',
      doctorName: sample.doctor?.name?.trim() || 'Unknown doctor',
      locationId: sample.locationId ?? '',
      locationName: sample.location?.name?.trim() || 'No branch',
      pairs
    });
  }

  groups.sort(
    (a, b) =>
      a.doctorName.localeCompare(b.doctorName) ||
      a.locationName.localeCompare(b.locationName) ||
      a.pairs[0].dayLabel.localeCompare(b.pairs[0].dayLabel)
  );

  return {
    success: true,
    data: {
      groups,
      sessionsScanned: rows.length,
      doctorsScanned: doctorIds.size,
      pairCount: groups.reduce((sum, group) => sum + group.pairs.length, 0),
      fromDate,
      toDate
    }
  };
}
