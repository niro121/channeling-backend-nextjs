import { format } from 'date-fns';
import prisma from '@/lib/prisma';

const DEFAULT_SHIFTS_PER_PERSON_PER_DAY = 1;

export type StaffDayShiftLimitResult =
  | {
      ok: true;
      limit: number;
      existingCount: number;
      rosterCode: string;
    }
  | {
      ok: false;
      limit: number;
      existingCount: number;
      rosterCode: string;
      message: string;
      issues: Record<string, string[]>;
    };

function normalizeRosterCode(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  // Manage Roster codes → uppercase; legacy placeholders (e.g. roster_a) unchanged.
  return raw.includes('_') ? raw : raw.toUpperCase();
}

/**
 * Resolve Manage Roster `shiftsPerPersonPerDay` for a roster code.
 * Missing / legacy codes default to 1 (matches `@@unique([staffId, date])` v1 ceiling).
 */
export async function getShiftsPerPersonPerDayLimit(
  rosterCode: string | null | undefined
): Promise<{ limit: number; rosterCode: string }> {
  const code = normalizeRosterCode(rosterCode);
  if (!code || code.includes('_')) {
    return { limit: DEFAULT_SHIFTS_PER_PERSON_PER_DAY, rosterCode: code };
  }

  const roster = await prisma.manageRoster.findFirst({
    where: { code },
    select: { code: true, shiftsPerPersonPerDay: true }
  });

  const limit = roster?.shiftsPerPersonPerDay;
  return {
    rosterCode: roster?.code ?? code,
    limit:
      typeof limit === 'number' && Number.isFinite(limit) && limit >= 1
        ? Math.floor(limit)
        : DEFAULT_SHIFTS_PER_PERSON_PER_DAY
  };
}

/**
 * INT-R4: reject when staff already has ≥ Manage Roster day limit on that calendar day.
 * v1 schema still enforces hospital-wide `@@unique([staffId, date])` (max 1 cell).
 */
export async function assertStaffDayShiftLimit(input: {
  staffId: string;
  date: Date;
  rosterCode?: string | null;
  /** When updating an existing cell, exclude it from the count. */
  excludeAllocationId?: string | null;
  issueField?: string;
}): Promise<StaffDayShiftLimitResult> {
  const issueField = input.issueField ?? 'rosterDate';
  // Caller must pass UTC start-of-day (same convention as RosterAllocation.date).
  const day = input.date;

  const { limit, rosterCode } = await getShiftsPerPersonPerDayLimit(
    input.rosterCode
  );

  const existingCount = await prisma.rosterAllocation.count({
    where: {
      staffId: input.staffId,
      date: day,
      ...(input.excludeAllocationId
        ? { id: { not: input.excludeAllocationId } }
        : {})
    }
  });

  if (existingCount < limit) {
    return { ok: true, limit, existingCount, rosterCode };
  }

  const dateLabel = format(day, 'dd MMM yyyy');
  const rosterLabel = rosterCode || 'this roster';
  const message =
    limit === 1
      ? `This staff member already has a shift on ${dateLabel}. Manage Roster “${rosterLabel}” allows ${limit} shift per person per day.`
      : `This staff member already has ${existingCount} shift(s) on ${dateLabel}. Manage Roster “${rosterLabel}” allows ${limit} shift(s) per person per day.`;

  return {
    ok: false,
    limit,
    existingCount,
    rosterCode,
    message,
    issues: {
      [issueField]: [
        `Maximum ${limit} shift(s) per person per day under ${rosterLabel}`
      ]
    }
  };
}
