import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  colomboDateIsoToUtc,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import type {
  ConfirmAttendanceToRosterResult,
  ConfirmAttendanceToRosterResultItem,
  DutyAttendanceMapped
} from '@/types/attendance';

/**
 * Map AttendanceDay status → Duty Roster attendance enum.
 * Returns null when the cell should be skipped (missing punch, leave, off, etc.).
 */
export function mapDayStatusToDutyAttendance(
  status: string,
  flags: string[] = []
): DutyAttendanceMapped | null {
  const s = status.trim().toLowerCase();
  if (s === 'late') return 'late';
  if (s === 'absent') return 'absent';
  if (s === 'present' || s === 'early_out' || s === 'half_day') return 'present';
  if (s === 'missing_punch' || s === 'incomplete') return null;
  if (
    s === 'on_leave' ||
    s === 'leave' ||
    s === 'holiday' ||
    s === 'day_off' ||
    s === 'not_rostered'
  ) {
    return null;
  }
  if (flags.includes('early_exit') && s === 'present') return 'present';
  return null;
}

function skipItem(
  base: Pick<
    ConfirmAttendanceToRosterResultItem,
    'attendanceDayId' | 'staffId' | 'staffCode' | 'staffName'
  >,
  reason: string
): ConfirmAttendanceToRosterResultItem {
  return { ...base, outcome: 'skipped', reason };
}

async function confirmOneDay(
  day: {
    id: string;
    staffId: string;
    staffCode: string;
    staffName: string;
    date: Date;
    status: string;
    flags: string[];
    rosterAllocationId: string | null;
  },
  auditUser: AuditUser | undefined
): Promise<ConfirmAttendanceToRosterResultItem> {
  const base = {
    attendanceDayId: day.id,
    staffId: day.staffId,
    staffCode: day.staffCode || '—',
    staffName: day.staffName || '—'
  };

  const dutyAttendance = mapDayStatusToDutyAttendance(day.status, day.flags);
  if (!dutyAttendance) {
    return skipItem(
      base,
      `Status "${day.status}" does not map to duty present/late/absent`
    );
  }

  let allocation =
    day.rosterAllocationId
      ? await prisma.rosterAllocation.findUnique({
          where: { id: day.rosterAllocationId },
          select: {
            id: true,
            staffId: true,
            isLeave: true,
            attendance: true
          }
        })
      : null;

  if (!allocation) {
    allocation = await prisma.rosterAllocation.findFirst({
      where: { staffId: day.staffId, date: day.date },
      select: {
        id: true,
        staffId: true,
        isLeave: true,
        attendance: true
      }
    });
  }

  if (!allocation) {
    return skipItem(base, 'No roster allocation for this staff/date');
  }

  if (allocation.isLeave) {
    return skipItem(base, 'Roster cell is marked leave — skipped');
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.rosterAllocation.update({
      where: { id: allocation.id },
      data: {
        attendance: dutyAttendance,
        updatedBy: auditUser?.id
      }
    }),
    prisma.attendanceDay.update({
      where: { id: day.id },
      data: {
        rosterAllocationId: allocation.id,
        confirmedToRosterAt: now,
        updatedBy: auditUser?.id
      }
    })
  ]);

  return {
    ...base,
    outcome: 'confirmed',
    dutyAttendance,
    rosterAllocationId: allocation.id
  };
}

/**
 * Confirm one or many AttendanceDay rows onto RosterAllocation.attendance.
 * Never called from punch ingest — HR-only.
 */
export async function confirmAttendanceDaysToRoster(input: {
  dateIso?: string;
  attendanceDayIds?: string[];
  user?: AuditUser;
}): Promise<{
  success: boolean;
  data?: ConfirmAttendanceToRosterResult;
  error?: { message: string };
}> {
  try {
    const auditUser = toAuditUser(input.user);
    const ids = (input.attendanceDayIds ?? [])
      .map((id) => id.trim())
      .filter(Boolean);

    let days: Array<{
      id: string;
      staffId: string;
      staffCode: string;
      staffName: string;
      date: Date;
      status: string;
      flags: string[];
      rosterAllocationId: string | null;
    }>;

    if (ids.length > 0) {
      days = await prisma.attendanceDay.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          staffId: true,
          staffCode: true,
          staffName: true,
          date: true,
          status: true,
          flags: true,
          rosterAllocationId: true
        }
      });
    } else {
      const dateIso =
        input.dateIso?.trim().slice(0, 10) || toColomboDateIso(new Date());
      const civilDay = colomboDateIsoToUtc(dateIso);
      days = await prisma.attendanceDay.findMany({
        where: { date: civilDay },
        select: {
          id: true,
          staffId: true,
          staffCode: true,
          staffName: true,
          date: true,
          status: true,
          flags: true,
          rosterAllocationId: true
        }
      });
    }

    if (days.length === 0) {
      return {
        success: false,
        error: { message: 'No attendance days found to confirm' }
      };
    }

    const dateIso = toColomboDateIso(days[0]!.date);
    const items: ConfirmAttendanceToRosterResultItem[] = [];

    for (const day of days) {
      try {
        items.push(await confirmOneDay(day, auditUser));
      } catch (err: any) {
        items.push({
          attendanceDayId: day.id,
          staffId: day.staffId,
          staffCode: day.staffCode || '—',
          staffName: day.staffName || '—',
          outcome: 'failed',
          reason: err?.message || 'Confirm failed'
        });
      }
    }

    const confirmed = items.filter((i) => i.outcome === 'confirmed').length;
    const skipped = items.filter((i) => i.outcome === 'skipped').length;
    const failed = items.filter((i) => i.outcome === 'failed').length;

    return {
      success: true,
      data: {
        date: dateIso,
        confirmed,
        skipped,
        failed,
        items
      }
    };
  } catch (error: any) {
    console.error('confirmAttendanceDaysToRoster error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to confirm attendance to duty roster'
      }
    };
  }
}

export async function confirmAttendanceDayToRoster(input: {
  attendanceDayId: string;
  user?: AuditUser;
}): Promise<{
  success: boolean;
  data?: ConfirmAttendanceToRosterResult;
  error?: { message: string };
}> {
  return confirmAttendanceDaysToRoster({
    attendanceDayIds: [input.attendanceDayId],
    user: input.user
  });
}
