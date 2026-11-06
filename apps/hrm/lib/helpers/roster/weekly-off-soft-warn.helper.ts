import { format, parseISO } from 'date-fns';
import prisma from '@/lib/prisma';
import {
  colomboCivilDayUtc,
  getColomboWeekdayId,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import { SHIFT_ASSIGNMENT_WEEKLY_OFF_DAYS } from '@/types/roster';

export type WeeklyOffSoftWarnHit = {
  assignmentId: string;
  assignmentCode: string;
  weeklyOffDay: string;
  shiftLabel: string;
};

export type WeeklyOffSoftWarnResult =
  | { ok: true; hits: WeeklyOffSoftWarnHit[] }
  | {
      ok: false;
      requiresAck: true;
      softWarnings: string[];
      message: string;
      hits: WeeklyOffSoftWarnHit[];
    };

const WEEKDAY_LABEL: Record<string, string> = Object.fromEntries(
  SHIFT_ASSIGNMENT_WEEKLY_OFF_DAYS.map((row) => [row.id, row.name])
);

function formatCivilDayLabel(date: Date): string {
  const iso = toColomboDateIso(colomboCivilDayUtc(date));
  try {
    return format(parseISO(iso), 'EEE dd MMM yyyy');
  } catch {
    return iso;
  }
}

function weekdayLabel(id: string): string {
  return WEEKDAY_LABEL[id] ?? id;
}

/**
 * Active/pending standing assignments covering the duty civil day.
 */
export async function findCoveringStandingAssignments(input: {
  staffId: string;
  date: Date;
}): Promise<
  Array<{
    id: string;
    code: string;
    weeklyOffDay: string;
    shiftLabel: string;
  }>
> {
  const civil = colomboCivilDayUtc(input.date);
  const nextDay = new Date(civil);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const rows = await prisma.staffShiftAssignment.findMany({
    where: {
      staffId: input.staffId,
      status: { in: ['active', 'pending'] },
      effectiveFrom: { lt: nextDay },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: civil } }]
    },
    orderBy: [{ effectiveFrom: 'desc' }],
    select: {
      id: true,
      code: true,
      weeklyOffDay: true,
      shiftType: { select: { name: true, code: true, status: true } }
    },
    take: 20
  });

  return rows
    .filter((row) => row.shiftType.status === 'active')
    .map((row) => ({
      id: row.id,
      code: row.code ?? '',
      weeklyOffDay: (row.weeklyOffDay ?? 'sunday').toLowerCase(),
      shiftLabel: row.shiftType.code
        ? `${row.shiftType.code} — ${row.shiftType.name}`
        : row.shiftType.name
    }));
}

/**
 * Soft warn when duty date is the weekly off day on any covering standing assignment.
 * Soft only — pass `acknowledgedWarnings: true` to continue.
 */
export async function assertWeeklyOffSoftWarn(input: {
  staffId: string;
  date: Date;
  acknowledgedWarnings?: boolean;
  staffLabel?: string;
}): Promise<WeeklyOffSoftWarnResult> {
  if (input.acknowledgedWarnings) {
    return { ok: true, hits: [] };
  }

  const weekdayId = getColomboWeekdayId(colomboCivilDayUtc(input.date));
  const covering = await findCoveringStandingAssignments({
    staffId: input.staffId,
    date: input.date
  });

  const hits: WeeklyOffSoftWarnHit[] = covering
    .filter((row) => row.weeklyOffDay === weekdayId)
    .map((row) => ({
      assignmentId: row.id,
      assignmentCode: row.code,
      weeklyOffDay: row.weeklyOffDay,
      shiftLabel: row.shiftLabel
    }));

  if (hits.length === 0) {
    return { ok: true, hits: [] };
  }

  const dayLabel = formatCivilDayLabel(input.date);
  const who = input.staffLabel?.trim() || 'This staff member';
  const offLabel = weekdayLabel(weekdayId);
  const details = hits
    .map((hit) => {
      const code = hit.assignmentCode ? ` (${hit.assignmentCode})` : '';
      return `${hit.shiftLabel}${code}`;
    })
    .join('; ');

  const softWarnings = [
    `${who} has weekly off on ${offLabel} (${dayLabel}) under standing assignment: ${details}. Continue allocating anyway?`
  ];

  return {
    ok: false,
    requiresAck: true,
    softWarnings,
    message: softWarnings[0],
    hits
  };
}

/** Batch weekly-off check for publish / fill. */
export async function assertWeeklyOffSoftWarnForAllocations(input: {
  rows: Array<{ staffId: string; staffLabel?: string; date: Date }>;
  acknowledgedWarnings?: boolean;
}): Promise<WeeklyOffSoftWarnResult> {
  if (input.acknowledgedWarnings || input.rows.length === 0) {
    return { ok: true, hits: [] };
  }

  const seen = new Set<string>();
  const warnings: string[] = [];
  const allHits: WeeklyOffSoftWarnHit[] = [];

  for (const row of input.rows) {
    const key = `${row.staffId}|${toColomboDateIso(colomboCivilDayUtc(row.date))}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = await assertWeeklyOffSoftWarn({
      staffId: row.staffId,
      date: row.date,
      staffLabel: row.staffLabel,
      acknowledgedWarnings: false
    });
    if (!result.ok) {
      warnings.push(...result.softWarnings);
      allHits.push(...result.hits);
    }
  }

  if (warnings.length === 0) {
    return { ok: true, hits: [] };
  }

  const softWarnings = [
    `${warnings.length} allocation(s) fall on standing weekly-off days. Continue anyway?`,
    ...warnings.slice(0, 5)
  ];

  return {
    ok: false,
    requiresAck: true,
    softWarnings,
    message: softWarnings.join(' '),
    hits: allHits
  };
}
