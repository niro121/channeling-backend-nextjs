import prisma from '@/lib/prisma';
import {
  colomboCivilDayUtc,
  colomboDayEndInstant,
  colomboDayStartInstant,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import { classifyAttendanceDay } from '@/services/attendance-services/attendance-rules.service';
import type { AttendanceDayRecord } from '@/types/attendance';

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

/**
 * Recompute AttendanceDay for the Colombo civil day of a punch.
 * Does not write RosterAllocation.attendance (HR confirm is separate).
 */
export async function recomputeAttendanceDayForPunch(input: {
  staffId: string;
  punchedAt: Date;
  deviceLocation?: string;
}): Promise<{
  success: boolean;
  data?: AttendanceDayRecord;
  error?: { message?: string };
}> {
  try {
    const civilDay = colomboCivilDayUtc(input.punchedAt);
    const windowStart = colomboDayStartInstant(civilDay);
    // Include a few hours into next calendar morning for late outs / overnight bleed.
    const windowEnd = new Date(colomboDayEndInstant(civilDay).getTime() + 6 * 60 * 60 * 1000);

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

    const punches = await prisma.attendancePunch.findMany({
      where: {
        staffId: input.staffId,
        matchStatus: 'matched',
        punchedAt: { gte: windowStart, lt: windowEnd }
      },
      select: { punchedAt: true, direction: true },
      orderBy: { punchedAt: 'asc' }
    });

    const allocation = await prisma.rosterAllocation.findFirst({
      where: {
        staffId: input.staffId,
        date: civilDay
      },
      select: {
        id: true,
        isLeave: true,
        department: true,
        dutyLocation: true,
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
      }
    });

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

    const commonData = {
      staffCode: staff.code,
      staffName: staff.name,
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
    console.error('recomputeAttendanceDayForPunch error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to recompute attendance day' }
    };
  }
}
