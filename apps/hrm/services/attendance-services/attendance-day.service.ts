import prisma from '@/lib/prisma';
import {
  addColomboCivilDays,
  colomboCivilDayUtc,
  colomboDateIsoToUtc,
  colomboDayEndInstant,
  colomboDayStartInstant,
  colomboWallTimeToUtc,
  parseHhMmToMinutes,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import { classifyAttendanceDay } from '@/services/attendance-services/attendance-rules.service';
import type { AttendanceDayRecord } from '@/types/attendance';

const ALLOCATION_SELECT = {
  id: true,
  staffId: true,
  date: true,
  isLeave: true,
  department: true,
  dutyLocation: true,
  attendanceAllocation: true,
  startAt: true,
  endAt: true,
  staffCode: true,
  staffName: true,
  shiftType: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      graceMinutes: true,
      lateThresholdMinutes: true,
      earlyExitThresholdMinutes: true,
      isOvernight: true
    }
  }
} as const;

type AllocationRow = {
  id: string;
  staffId: string;
  date: Date;
  isLeave: boolean;
  department: string;
  dutyLocation: string;
  attendanceAllocation: string | null;
  startAt: Date | null;
  endAt: Date | null;
  staffCode: string;
  staffName: string;
  shiftType: {
    id: string;
    startTime: string;
    endTime: string;
    graceMinutes: number;
    lateThresholdMinutes: number;
    earlyExitThresholdMinutes: number;
    isOvernight: boolean;
  };
};

function toDayRecord(row: {
  id: string;
  staffId: string;
  date: Date;
  staffCode: string;
  staffName: string;
  department: string;
  location: string;
  firstInAt: Date | null;
  lastOutAt: Date | null;
  verifiedFirstInAt?: Date | null;
  verifiedLastOutAt?: Date | null;
  status: string;
  flags: string[];
  shiftTypeId: string | null;
  rosterAllocationId: string | null;
  confirmedToRosterAt: Date | null;
  correctionReason: string;
}): AttendanceDayRecord {
  return {
    id: row.id,
    staffId: row.staffId,
    date: toColomboDateIso(row.date),
    staffCode: row.staffCode,
    staffName: row.staffName,
    department: row.department,
    location: row.location,
    firstInAt: row.firstInAt?.toISOString() ?? null,
    lastOutAt: row.lastOutAt?.toISOString() ?? null,
    verifiedFirstInAt: row.verifiedFirstInAt?.toISOString() ?? null,
    verifiedLastOutAt: row.verifiedLastOutAt?.toISOString() ?? null,
    status: row.status,
    flags: row.flags,
    shiftTypeId: row.shiftTypeId,
    rosterAllocationId: row.rosterAllocationId,
    confirmedToRosterAt: row.confirmedToRosterAt?.toISOString() ?? null,
    correctionReason: row.correctionReason
  };
}

function departmentFromStaff(staff: {
  employmentDetails?: {
    employment?: { department?: string | null } | null;
  } | null;
}): string {
  return staff.employmentDetails?.employment?.department?.trim() || '';
}

function sameCivilDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

/** Civil days this allocation posts attendance to (Asia/Colombo UTC-midnight). */
export function attendanceCivilDaysForAllocation(alloc: {
  date: Date;
  attendanceAllocation: string | null;
  shiftType: { isOvernight: boolean };
}): Date[] {
  const startDay = new Date(
    Date.UTC(
      alloc.date.getUTCFullYear(),
      alloc.date.getUTCMonth(),
      alloc.date.getUTCDate()
    )
  );
  if (!alloc.shiftType.isOvernight) {
    return [startDay];
  }

  const endDay = addColomboCivilDays(startDay, 1);
  const mode = alloc.attendanceAllocation || 'shift_start';

  if (mode === 'shift_end') return [endDay];
  if (mode === 'split_both') return [startDay, endDay];
  return [startDay];
}

/** Does this allocation contribute an AttendanceDay on civilDay? */
export function allocationPostsToCivilDay(
  alloc: {
    date: Date;
    attendanceAllocation: string | null;
    shiftType: { isOvernight: boolean };
  },
  civilDay: Date
): boolean {
  return attendanceCivilDaysForAllocation(alloc).some((d) =>
    sameCivilDay(d, civilDay)
  );
}

/**
 * Punch collection window for an allocation.
 * Prefer startAt/endAt when set; otherwise derive from date + shift HH:mm.
 */
export function resolvePunchWindow(alloc: AllocationRow): {
  windowStart: Date;
  windowEnd: Date;
} {
  const earlyMarginMs = 2 * 60 * 60 * 1000;
  const lateMarginMs = 4 * 60 * 60 * 1000;

  if (alloc.startAt && alloc.endAt && alloc.endAt > alloc.startAt) {
    return {
      windowStart: new Date(alloc.startAt.getTime() - earlyMarginMs),
      windowEnd: new Date(alloc.endAt.getTime() + lateMarginMs)
    };
  }

  const startDay = new Date(
    Date.UTC(
      alloc.date.getUTCFullYear(),
      alloc.date.getUTCMonth(),
      alloc.date.getUTCDate()
    )
  );
  const startMins = parseHhMmToMinutes(alloc.shiftType.startTime) ?? 0;
  const endMins = parseHhMmToMinutes(alloc.shiftType.endTime) ?? 0;
  const startH = Math.floor(startMins / 60);
  const startM = startMins % 60;
  const endH = Math.floor(endMins / 60);
  const endM = endMins % 60;

  const windowStart = new Date(
    colomboWallTimeToUtc(startDay, startH, startM).getTime() - earlyMarginMs
  );

  let endDay = startDay;
  if (alloc.shiftType.isOvernight || endMins <= startMins) {
    endDay = addColomboCivilDays(startDay, 1);
  }
  const windowEnd = new Date(
    colomboWallTimeToUtc(endDay, endH, endM).getTime() + lateMarginMs
  );

  return { windowStart, windowEnd };
}

function punchWindowForCivilDayFallback(civilDay: Date): {
  windowStart: Date;
  windowEnd: Date;
} {
  return {
    windowStart: colomboDayStartInstant(civilDay),
    windowEnd: new Date(colomboDayEndInstant(civilDay).getTime() + 6 * 60 * 60 * 1000)
  };
}

async function loadNearbyAllocations(
  staffId: string,
  civilDay: Date
): Promise<AllocationRow[]> {
  const prev = addColomboCivilDays(civilDay, -1);
  const next = addColomboCivilDays(civilDay, 1);
  const rows = await prisma.rosterAllocation.findMany({
    where: {
      staffId,
      date: { in: [prev, civilDay, next] }
    },
    select: ALLOCATION_SELECT
  });
  return rows as AllocationRow[];
}

/** Prefer allocation whose shift window contains the punch; else posts-to-day match. */
export async function resolveAllocationForPunch(input: {
  staffId: string;
  punchedAt: Date;
}): Promise<AllocationRow | null> {
  const civilDay = colomboCivilDayUtc(input.punchedAt);
  const nearby = await loadNearbyAllocations(input.staffId, civilDay);

  const containing = nearby.filter((alloc) => {
    const { windowStart, windowEnd } = resolvePunchWindow(alloc);
    return (
      input.punchedAt.getTime() >= windowStart.getTime() &&
      input.punchedAt.getTime() < windowEnd.getTime()
    );
  });

  if (containing.length === 1) return containing[0]!;
  if (containing.length > 1) {
    const overnight = containing.find((a) => a.shiftType.isOvernight);
    return overnight ?? containing[0]!;
  }

  const posting = nearby.find((a) => allocationPostsToCivilDay(a, civilDay));
  return posting ?? null;
}

export async function resolveAllocationForAttendanceDay(input: {
  staffId: string;
  civilDay: Date;
}): Promise<AllocationRow | null> {
  const nearby = await loadNearbyAllocations(input.staffId, input.civilDay);
  const posting = nearby.filter((a) =>
    allocationPostsToCivilDay(a, input.civilDay)
  );
  if (posting.length === 0) return null;
  if (posting.length === 1) return posting[0]!;
  const overnight = posting.find((a) => a.shiftType.isOvernight);
  return overnight ?? posting[0]!;
}

/**
 * Recompute one AttendanceDay for staff × Colombo civil day.
 * Does not write RosterAllocation.attendance (HR confirm is separate).
 */
export async function recomputeAttendanceDayForStaffDate(input: {
  staffId: string;
  civilDay: Date;
  deviceLocation?: string;
  allocation?: AllocationRow | null;
}): Promise<{
  success: boolean;
  data?: AttendanceDayRecord;
  error?: { message?: string };
}> {
  try {
    const civilDay = new Date(
      Date.UTC(
        input.civilDay.getUTCFullYear(),
        input.civilDay.getUTCMonth(),
        input.civilDay.getUTCDate()
      )
    );

    const staff = await prisma.staff.findUnique({
      where: { id: input.staffId },
      select: {
        id: true,
        code: true,
        name: true,
        employmentDetails: true
      }
    });
    if (!staff) {
      return { success: false, error: { message: 'Staff not found' } };
    }

    const allocation =
      input.allocation !== undefined
        ? input.allocation
        : await resolveAllocationForAttendanceDay({
            staffId: input.staffId,
            civilDay
          });

    const { windowStart, windowEnd } = allocation
      ? resolvePunchWindow(allocation)
      : punchWindowForCivilDayFallback(civilDay);

    const punches = await prisma.attendancePunch.findMany({
      where: {
        staffId: input.staffId,
        matchStatus: 'matched',
        punchedAt: { gte: windowStart, lt: windowEnd }
      },
      select: { punchedAt: true, direction: true },
      orderBy: { punchedAt: 'asc' }
    });

    // For split_both, only count punches that fall on this civil day's half when classifying pair on that day.
    // Keep full shift window punches so overnight pairing still works; classification uses all window punches.
    const classified = classifyAttendanceDay({
      punches,
      isLeave: Boolean(allocation?.isLeave),
      hasRoster: Boolean(allocation),
      shift: allocation?.shiftType
        ? {
            startTime: allocation.shiftType.startTime,
            endTime: allocation.shiftType.endTime,
            graceMinutes: allocation.shiftType.graceMinutes,
            lateThresholdMinutes: allocation.shiftType.lateThresholdMinutes,
            earlyExitThresholdMinutes:
              allocation.shiftType.earlyExitThresholdMinutes,
            isOvernight: allocation.shiftType.isOvernight
          }
        : null
    });

    const department =
      allocation?.department?.trim() || departmentFromStaff(staff);
    const location =
      input.deviceLocation?.trim() ||
      allocation?.dutyLocation?.trim() ||
      '';

    const existing = await prisma.attendanceDay.findFirst({
      where: { staffId: input.staffId, date: civilDay }
    });

    // Do not overwrite HR corrections blindly: if corrected and no new punches / leave change — still recompute status from punches (corrections are P4). For now always recompute.

    const commonData = {
      staffCode: allocation?.staffCode || staff.code,
      staffName: allocation?.staffName || staff.name,
      department,
      location,
      firstInAt: classified.firstInAt,
      lastOutAt: classified.lastOutAt,
      status: classified.status,
      flags: classified.flags,
      shiftTypeId: allocation?.shiftType?.id ?? null,
      rosterAllocationId: allocation?.id ?? null,
      updatedAt: new Date()
    };

    const saved = existing
      ? await prisma.attendanceDay.update({
          where: { id: existing.id },
          data: commonData
        })
      : await prisma.attendanceDay.create({
          data: {
            staffId: input.staffId,
            date: civilDay,
            ...commonData
          }
        });

    return { success: true, data: toDayRecord(saved) };
  } catch (error: any) {
    console.error('recomputeAttendanceDayForStaffDate error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to recompute attendance day' }
    };
  }
}

/**
 * Recompute after a punch: resolve owning allocation (overnight-aware),
 * then refresh every attendance civil day that allocation posts to.
 */
export async function recomputeAttendanceDayForPunch(input: {
  staffId: string;
  punchedAt: Date;
  deviceLocation?: string;
}): Promise<{
  success: boolean;
  data?: AttendanceDayRecord;
  days?: AttendanceDayRecord[];
  error?: { message?: string };
}> {
  try {
    const allocation = await resolveAllocationForPunch(input);
    const punchCivil = colomboCivilDayUtc(input.punchedAt);

    const daysToRecompute = allocation
      ? attendanceCivilDaysForAllocation(allocation)
      : [punchCivil];

    const results: AttendanceDayRecord[] = [];
    for (const civilDay of daysToRecompute) {
      const result = await recomputeAttendanceDayForStaffDate({
        staffId: input.staffId,
        civilDay,
        deviceLocation: input.deviceLocation,
        allocation:
          allocation && allocationPostsToCivilDay(allocation, civilDay)
            ? allocation
            : undefined
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      if (result.data) results.push(result.data);
    }

    const primary =
      results.find((d) => d.date === toColomboDateIso(punchCivil)) ??
      results[0];

    return { success: true, data: primary, days: results };
  } catch (error: any) {
    console.error('recomputeAttendanceDayForPunch error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to recompute attendance day' }
    };
  }
}

/**
 * Batch recompute for a Colombo civil date: all roster allocations that post
 * attendance to that day (creates Absent when rostered with zero punches).
 */
export async function recomputeAttendanceDaysForDate(input: {
  dateIso: string;
}): Promise<{
  success: boolean;
  data?: {
    date: string;
    processed: number;
    absent: number;
    onLeave: number;
    errors: number;
  };
  error?: { message?: string };
}> {
  try {
    const civilDay = colomboDateIsoToUtc(input.dateIso);
    const prev = addColomboCivilDays(civilDay, -1);

    const candidates = (await prisma.rosterAllocation.findMany({
      where: {
        date: { in: [prev, civilDay] }
      },
      select: ALLOCATION_SELECT
    })) as AllocationRow[];

    const forDay = candidates.filter((a) =>
      allocationPostsToCivilDay(a, civilDay)
    );

    // Unique staff (one allocation preferred — overnight wins if duplicate)
    const byStaff = new Map<string, AllocationRow>();
    for (const alloc of forDay) {
      const existing = byStaff.get(alloc.staffId);
      if (!existing || (alloc.shiftType.isOvernight && !existing.shiftType.isOvernight)) {
        byStaff.set(alloc.staffId, alloc);
      }
    }

    let processed = 0;
    let absent = 0;
    let onLeave = 0;
    let errors = 0;

    for (const [staffId, allocation] of byStaff) {
      const result = await recomputeAttendanceDayForStaffDate({
        staffId,
        civilDay,
        allocation
      });
      if (!result.success) {
        errors += 1;
        continue;
      }
      processed += 1;
      if (result.data?.status === 'absent') absent += 1;
      if (result.data?.status === 'on_leave') onLeave += 1;
    }

    return {
      success: true,
      data: {
        date: toColomboDateIso(civilDay),
        processed,
        absent,
        onLeave,
        errors
      }
    };
  } catch (error: any) {
    console.error('recomputeAttendanceDaysForDate error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to recompute attendance days' }
    };
  }
}
