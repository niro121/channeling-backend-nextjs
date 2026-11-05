import { format } from 'date-fns';
import prisma from '@/lib/prisma';

/** Leave statuses that trigger INT-L2 soft warn on roster allocate / fill / publish. */
export const LEAVE_SOFT_WARN_STATUSES = ['approved', 'pending'] as const;

export type LeaveSoftWarnHit = {
  id: string;
  status: string;
  fromDate: Date;
  toDate: Date;
  leaveTypeName: string;
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

function toUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

function endOfUtcDay(date: Date): Date {
  const day = toUtcDay(date);
  return new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Find Leave Applications for staff that overlap a calendar day
 * (approved + pending). Rejected / cancelled are ignored.
 */
export async function findStaffLeaveOverlappingDay(input: {
  staffId: string;
  date: Date;
}): Promise<LeaveSoftWarnHit[]> {
  const dayStart = toUtcDay(input.date);
  const dayEnd = endOfUtcDay(input.date);

  const rows = await prisma.leaveApplication.findMany({
    where: {
      staffId: input.staffId,
      status: { in: [...LEAVE_SOFT_WARN_STATUSES] },
      fromDate: { lte: dayEnd },
      toDate: { gte: dayStart }
    },
    select: {
      id: true,
      status: true,
      fromDate: true,
      toDate: true,
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
    leaveTypeName: row.leaveType?.name?.trim() || 'Leave'
  }));
}

function formatLeaveHit(hit: LeaveSoftWarnHit): string {
  const range =
    hit.fromDate.toISOString().slice(0, 10) ===
    hit.toDate.toISOString().slice(0, 10)
      ? format(hit.fromDate, 'dd MMM yyyy')
      : `${format(hit.fromDate, 'dd MMM yyyy')}–${format(hit.toDate, 'dd MMM yyyy')}`;
  return `${hit.leaveTypeName} (${hit.status}) ${range}`;
}

/**
 * INT-L2 — soft warn when allocating on a day the staff has leave.
 * Not a hard block: pass `acknowledgedWarnings: true` to continue.
 */
export async function assertLeaveSoftWarn(input: {
  staffId: string;
  date: Date;
  acknowledgedWarnings?: boolean;
  staffLabel?: string;
}): Promise<LeaveSoftWarnResult> {
  const hits = await findStaffLeaveOverlappingDay({
    staffId: input.staffId,
    date: input.date
  });

  if (hits.length === 0 || input.acknowledgedWarnings) {
    return { ok: true, hits };
  }

  const dayLabel = format(toUtcDay(input.date), 'dd MMM yyyy');
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
  rows: Array<{ staffId: string; staffLabel?: string; date: Date }>;
  acknowledgedWarnings?: boolean;
}): Promise<LeaveSoftWarnResult> {
  if (input.acknowledgedWarnings || input.rows.length === 0) {
    return { ok: true, hits: [] };
  }

  const seen = new Set<string>();
  const warnings: string[] = [];
  const allHits: LeaveSoftWarnHit[] = [];

  for (const row of input.rows) {
    const key = `${row.staffId}|${row.date.toISOString().slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = await assertLeaveSoftWarn({
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
