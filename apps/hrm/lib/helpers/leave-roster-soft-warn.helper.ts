import { format, parseISO } from 'date-fns';
import prisma from '@/lib/prisma';
import { dutyOverlapsLeaveWindow } from '@/lib/helpers/shift-time-overlap.helper';
import {
  colomboCivilDayUtc,
  colomboDayEndInstant,
  colomboDayStartInstant,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';

/** Leave statuses that trigger INT-L2 soft warn on roster allocate / fill / publish. */
export const LEAVE_SOFT_WARN_STATUSES = ['approved', 'pending'] as const;

export type LeaveSoftWarnHit = {
  id: string;
  status: string;
  fromDate: Date;
  toDate: Date;
  leaveTypeName: string;
  days: number;
  halfDaySession: string | null;
};

export type LeaveSoftWarnResult =
  | { ok: true; hits: LeaveSoftWarnHit[] }
  | {
      ok: false;
      requiresAck: true;
      softWarnings: string[];
      message: string;
      hits: LeaveSoftWarnHit[];
    };

/**
 * Hospital civil day as UTC midnight.
 * Duty dates are already UTC midnight; leave picker dates are often local
 * midnight — `colomboCivilDayUtc` maps both to the same Asia/Colombo day.
 */
function resolveDutyCivilDayUtc(date: Date): Date {
  return colomboCivilDayUtc(date);
}

function formatColomboDayLabel(civilDayUtc: Date): string {
  try {
    return format(parseISO(toColomboDateIso(civilDayUtc)), 'dd MMM yyyy');
  } catch {
    return toColomboDateIso(civilDayUtc);
  }
}

/**
 * Find Leave Applications for staff that overlap a hospital calendar day
 * (approved + pending). Rejected / cancelled are ignored.
 *
 * Overlap uses Asia/Colombo day bounds so leave stored as local midnight
 * still matches RosterAllocation dates stored as UTC midnight.
 */
export async function findStaffLeaveOverlappingDay(input: {
  staffId: string;
  date: Date;
}): Promise<LeaveSoftWarnHit[]> {
  const civilDayUtc = resolveDutyCivilDayUtc(input.date);
  const dayStart = colomboDayStartInstant(civilDayUtc);
  const dayEndExclusive = colomboDayEndInstant(civilDayUtc);
  // Inclusive end for Mongo `lte` (1ms before next Colombo midnight).
  const dayEndInclusive = new Date(dayEndExclusive.getTime() - 1);

  const rows = await prisma.leaveApplication.findMany({
    where: {
      staffId: input.staffId,
      status: { in: [...LEAVE_SOFT_WARN_STATUSES] },
      fromDate: { lte: dayEndInclusive },
      toDate: { gte: dayStart }
    },
    select: {
      id: true,
      status: true,
      fromDate: true,
      toDate: true,
      days: true,
      halfDaySession: true,
      leaveType: { select: { name: true } }
    },
    orderBy: { fromDate: 'asc' },
    take: 5
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    fromDate: row.fromDate,
    toDate: row.toDate,
    days: row.days,
    halfDaySession: row.halfDaySession,
    leaveTypeName: row.leaveType?.name?.trim() || 'Leave'
  }));
}

function formatLeaveHit(hit: LeaveSoftWarnHit): string {
  const fromIso = toColomboDateIso(hit.fromDate);
  const toIso = toColomboDateIso(hit.toDate);
  const range =
    fromIso === toIso
      ? formatColomboDayLabel(colomboCivilDayUtc(hit.fromDate))
      : `${formatColomboDayLabel(colomboCivilDayUtc(hit.fromDate))}–${formatColomboDayLabel(colomboCivilDayUtc(hit.toDate))}`;
  const half =
    hit.days === 0.5 && hit.halfDaySession
      ? ` ${hit.halfDaySession} half-day`
      : '';
  return `${hit.leaveTypeName} (${hit.status})${half} ${range}`;
}

function filterHitsForDutyWindow(
  hits: LeaveSoftWarnHit[],
  startTime?: string | null,
  endTime?: string | null
): LeaveSoftWarnHit[] {
  if (!startTime?.trim() || !endTime?.trim()) {
    return hits;
  }
  return hits.filter((hit) =>
    dutyOverlapsLeaveWindow({
      startTime,
      endTime,
      halfDaySession: hit.halfDaySession,
      days: hit.days
    })
  );
}

/**
 * INT-L2 — soft warn when allocating on a day the staff has leave that
 * overlaps the duty shift window (full-day leave, or half-day AM/PM).
 * Not a hard block: pass `acknowledgedWarnings: true` to continue.
 */
export async function assertLeaveSoftWarn(input: {
  staffId: string;
  date: Date;
  acknowledgedWarnings?: boolean;
  staffLabel?: string;
  /** When set, half-day leave only warns if it intersects this shift. */
  startTime?: string | null;
  endTime?: string | null;
}): Promise<LeaveSoftWarnResult> {
  const dayHits = await findStaffLeaveOverlappingDay({
    staffId: input.staffId,
    date: input.date
  });
  const hits = filterHitsForDutyWindow(
    dayHits,
    input.startTime,
    input.endTime
  );

  if (hits.length === 0 || input.acknowledgedWarnings) {
    return { ok: true, hits };
  }

  const dayLabel = formatColomboDayLabel(resolveDutyCivilDayUtc(input.date));
  const who = input.staffLabel?.trim() || 'This staff member';
  const details = hits.map(formatLeaveHit).join('; ');
  const softWarnings = [
    `${who} has leave covering ${dayLabel}: ${details}. Continue allocating anyway?`
  ];

  return {
    ok: false,
    requiresAck: true,
    softWarnings,
    message: softWarnings[0],
    hits
  };
}

/** Batch INT-L2 check for publish / fill: unique staff×day leave hits. */
export async function assertLeaveSoftWarnForAllocations(input: {
  rows: Array<{
    staffId: string;
    staffLabel?: string;
    date: Date;
    startTime?: string | null;
    endTime?: string | null;
  }>;
  acknowledgedWarnings?: boolean;
}): Promise<LeaveSoftWarnResult> {
  if (input.acknowledgedWarnings || input.rows.length === 0) {
    return { ok: true, hits: [] };
  }

  const seen = new Set<string>();
  const warnings: string[] = [];
  const allHits: LeaveSoftWarnHit[] = [];

  for (const row of input.rows) {
    const key = `${row.staffId}|${toColomboDateIso(resolveDutyCivilDayUtc(row.date))}|${row.startTime ?? ''}|${row.endTime ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = await assertLeaveSoftWarn({
      staffId: row.staffId,
      date: row.date,
      staffLabel: row.staffLabel,
      startTime: row.startTime,
      endTime: row.endTime,
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
    `${warnings.length} allocation(s) overlap staff leave. Continue anyway?`,
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
