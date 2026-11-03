import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import prisma from '@/lib/prisma';
import {
  ATTENDANCE_TIMEZONE,
  colomboDateIsoToUtc,
  colomboMinutesFromMidnight,
  parseHhMmToMinutes,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import {
  DAILY_ATTENDANCE_STATUS_OPTIONS,
  type DailyAttendanceFilterOptions,
  type DailyAttendanceRegister,
  type DailyAttendanceRow,
  type DailyAttendanceSummary,
  type GetDailyAttendanceParams
} from '@/types/attendance';
import { mapDayStatusToDutyAttendance } from '@/services/attendance-services/attendance-confirm-roster.service';

function toOption(value: string): { id: string; name: string } {
  return { id: value, name: value };
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])
  ].sort((a, b) => a.localeCompare(b));
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

function formatDateLabel(dateIso: string): string {
  const d = colomboDateIsoToUtc(dateIso);
  const zoned = new TZDate(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  return format(zoned, 'EEEE, d MMMM yyyy');
}

function formatShortDate(dateIso: string): string {
  const d = colomboDateIsoToUtc(dateIso);
  const zoned = new TZDate(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  return format(zoned, 'd MMM yyyy');
}

function formatHhMm(instant: Date | null | undefined): string {
  if (!instant) return '—';
  const zoned = new TZDate(instant.getTime(), ATTENDANCE_TIMEZONE);
  return format(zoned, 'HH:mm');
}

function formatDurationMinutes(totalMinutes: number | null): string {
  if (totalMinutes == null || totalMinutes <= 0) return '—';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins <= 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatOtHours(otHours: number | null | undefined): string {
  if (otHours == null || otHours <= 0) return '—';
  const totalMinutes = Math.round(otHours * 60);
  return formatDurationMinutes(totalMinutes);
}

type StaffEmployment = {
  institution?: string | null;
  department?: string | null;
  staffCategory?: string | null;
  staffDesignation?: string | null;
};

function employmentOf(staff: {
  employmentDetails?: { employment?: StaffEmployment | null } | null;
}): StaffEmployment {
  return staff.employmentDetails?.employment ?? {};
}

function matchesInstitution(
  employmentInstitution: string | null | undefined,
  filterId: string
): boolean {
  if (!filterId.trim()) return true;
  const emp = employmentInstitution?.trim() ?? '';
  if (!emp) return false;
  if (emp === filterId) return true;
  const option = INSTITUTION_OPTIONS.find((o) => o.id === filterId);
  if (!option) return false;
  return emp === option.name || emp.includes(option.name);
}

/** Normalize stored day status + flags → UI status id. */
export function toDailyDisplayStatus(
  status: string,
  flags: string[]
): string {
  const s = status.trim();
  if (s === 'on_leave' || s === 'leave') return 'leave';
  if (s === 'early_out') return 'early_out';
  if (s === 'half_day') return 'half_day';
  if (s === 'incomplete') return 'incomplete';
  if (s === 'holiday') return 'holiday';
  if (s === 'day_off' || s === 'not_rostered') return 'day_off';
  if (s === 'missing_punch') return 'missing_punch';
  if (s === 'late') return 'late';
  if (s === 'absent') return 'absent';
  if (s === 'present') {
    if (flags.includes('early_exit')) return 'early_out';
    return 'present';
  }
  if (flags.includes('early_exit') && s !== 'late') return 'early_out';
  return s || 'incomplete';
}

function statusLabel(statusId: string): string {
  return (
    DAILY_ATTENDANCE_STATUS_OPTIONS.find((o) => o.id === statusId)?.name ??
    statusId
  );
}

function deriveSource(input: {
  status: string;
  firstInAt: Date | null;
  lastOutAt: Date | null;
  correctionReason: string;
  hasRoster: boolean;
  isLeave: boolean;
  holidayId: string | null;
}): string {
  if (input.correctionReason.trim()) return 'Correction';
  if (input.isLeave || input.status === 'on_leave' || input.status === 'leave') {
    return 'Leave';
  }
  if (input.holidayId || input.status === 'holiday') return 'Calendar';
  if (input.firstInAt || input.lastOutAt) return 'RFID';
  if (input.hasRoster) return 'Roster';
  return 'System';
}

function deriveRemarks(input: {
  statusId: string;
  correctionReason: string;
  lateMinutes: number | null;
  earlyOutMinutes: number | null;
}): string {
  if (input.correctionReason.trim()) return input.correctionReason.trim();
  switch (input.statusId) {
    case 'present':
      return 'On time';
    case 'late':
      return input.lateMinutes
        ? `Late by ${formatDurationMinutes(input.lateMinutes)}`
        : 'Late arrival';
    case 'early_out':
      return input.earlyOutMinutes
        ? `Left early by ${formatDurationMinutes(input.earlyOutMinutes)}`
        : 'Early departure';
    case 'absent':
      return 'No attendance';
    case 'leave':
      return 'On leave';
    case 'holiday':
      return 'Public holiday';
    case 'day_off':
      return 'Day off';
    case 'missing_punch':
      return 'Requires correction';
    case 'incomplete':
      return 'Shift in progress';
    case 'half_day':
      return 'Half day';
    default:
      return '—';
  }
}

function computeLateMinutes(
  firstInAt: Date | null,
  shiftStart: string | null | undefined,
  graceMinutes: number
): number | null {
  if (!firstInAt || !shiftStart) return null;
  const startMins = parseHhMmToMinutes(shiftStart);
  if (startMins == null) return null;
  const arrival = colomboMinutesFromMidnight(firstInAt);
  const lateBy = arrival - (startMins + Math.max(0, graceMinutes || 0));
  return lateBy > 0 ? lateBy : null;
}

function computeEarlyOutMinutes(
  lastOutAt: Date | null,
  shiftEnd: string | null | undefined,
  earlyExitThresholdMinutes: number
): number | null {
  if (!lastOutAt || !shiftEnd) return null;
  const endMins = parseHhMmToMinutes(shiftEnd);
  if (endMins == null) return null;
  const threshold = Math.max(0, earlyExitThresholdMinutes || 0);
  const exitMins = colomboMinutesFromMidnight(lastOutAt);
  const earlyBy = endMins - threshold - exitMins;
  return earlyBy > 0 ? earlyBy : null;
}

function computeWorkedMinutes(
  firstInAt: Date | null,
  lastOutAt: Date | null
): number | null {
  if (!firstInAt || !lastOutAt) return null;
  const diff = Math.round(
    (lastOutAt.getTime() - firstInAt.getTime()) / (60 * 1000)
  );
  return diff > 0 ? diff : null;
}

function matchesDisplayStatusFilter(
  displayStatus: string,
  filterStatus: string,
  flags: string[]
): boolean {
  if (!filterStatus.trim() || filterStatus === '__all__') return true;
  if (filterStatus === 'early_out') {
    return (
      displayStatus === 'early_out' || flags.includes('early_exit')
    );
  }
  if (filterStatus === 'leave') {
    return displayStatus === 'leave';
  }
  if (filterStatus === 'day_off') {
    return displayStatus === 'day_off';
  }
  return displayStatus === filterStatus;
}

async function resolveStaffIdsForEmploymentFilters(params: {
  institution?: string;
  staffCategory?: string;
  designation?: string;
}): Promise<string[] | null> {
  const needsFilter =
    Boolean(params.institution?.trim()) ||
    Boolean(params.staffCategory?.trim()) ||
    Boolean(params.designation?.trim());
  if (!needsFilter) return null;

  const staffRows = await prisma.staff.findMany({
    where: { status: 1 },
    select: { id: true, employmentDetails: true }
  });

  return staffRows
    .filter((row) => {
      const employment = employmentOf(row);
      if (
        params.institution?.trim() &&
        !matchesInstitution(employment.institution, params.institution)
      ) {
        return false;
      }
      if (
        params.staffCategory?.trim() &&
        employment.staffCategory?.trim() !== params.staffCategory.trim()
      ) {
        return false;
      }
      if (
        params.designation?.trim() &&
        employment.staffDesignation?.trim() !== params.designation.trim()
      ) {
        return false;
      }
      return true;
    })
    .map((row) => row.id);
}

export async function getDailyAttendanceRegister(
  params: GetDailyAttendanceParams = {}
): Promise<{
  success: boolean;
  data?: DailyAttendanceRegister;
  error?: { message?: string };
}> {
  try {
    const dateIso =
      params.date?.trim().slice(0, 10) || toColomboDateIso(new Date());
    const civilDay = colomboDateIsoToUtc(dateIso);
    const pageSize = Math.min(
      Number.parseInt(params.limit || '10', 10) || 10,
      100
    );
    const pageNum = Math.max(Number.parseInt(params.page || '1', 10), 1);

    const staffIdsFromEmployment = await resolveStaffIdsForEmploymentFilters({
      institution: params.institution,
      staffCategory: params.staffCategory,
      designation: params.designation
    });

    if (staffIdsFromEmployment && staffIdsFromEmployment.length === 0) {
      const emptyOptions = await loadFilterOptions(civilDay);
      return {
        success: true,
        data: {
          date: dateIso,
          dateLabel: formatDateLabel(dateIso),
          summary: {
            present: 0,
            presentPct: null,
            absent: 0,
            absentPct: null,
            lateEarlyOut: 0,
            lateCount: 0,
            earlyOutCount: 0,
            missingPunches: 0,
            rosteredTotal: 0
          },
          rows: [],
          totalRecords: 0,
          filterOptions: emptyOptions
        }
      };
    }

    const dayWhere: Record<string, unknown> = { date: civilDay };
    if (params.department?.trim()) {
      dayWhere.department = params.department.trim();
    }
    if (params.staffId?.trim()) {
      dayWhere.staffId = params.staffId.trim();
    } else if (staffIdsFromEmployment) {
      dayWhere.staffId = { in: staffIdsFromEmployment };
    }
    if (params.shiftTypeId?.trim() && params.shiftTypeId !== '__all__') {
      dayWhere.shiftTypeId = params.shiftTypeId.trim();
    }

    const days = await prisma.attendanceDay.findMany({
      where: dayWhere,
      orderBy: [{ staffName: 'asc' }, { staffCode: 'asc' }]
    });

    const staffIds = [...new Set(days.map((d) => d.staffId))];
    const allocationIds = days
      .map((d) => d.rosterAllocationId)
      .filter(Boolean) as string[];
    const shiftTypeIds = days
      .map((d) => d.shiftTypeId)
      .filter(Boolean) as string[];

    const [staffRows, allocationsById, allocationsByStaffDate, shiftTypes] =
      await Promise.all([
        staffIds.length
          ? prisma.staff.findMany({
              where: { id: { in: staffIds } },
              select: {
                id: true,
                employmentDetails: true,
                shiftAssignments: {
                  where: { status: 'active' },
                  take: 1,
                  orderBy: { effectiveFrom: 'desc' },
                  select: { designation: true, unit: true, department: true }
                }
              }
            })
          : Promise.resolve([]),
        allocationIds.length
          ? prisma.rosterAllocation.findMany({
              where: { id: { in: allocationIds } },
              select: {
                id: true,
                staffId: true,
                unit: true,
                dutyLocation: true,
                isLeave: true,
                hours: true,
                otHours: true,
                holidayId: true,
                startAt: true,
                endAt: true,
                shiftTypeId: true,
                shiftType: {
                  select: {
                    id: true,
                    name: true,
                    chipLabel: true,
                    startTime: true,
                    endTime: true,
                    graceMinutes: true,
                    earlyExitThresholdMinutes: true
                  }
                }
              }
            })
          : Promise.resolve([]),
        staffIds.length
          ? prisma.rosterAllocation.findMany({
              where: { staffId: { in: staffIds }, date: civilDay },
              select: {
                id: true,
                staffId: true,
                unit: true,
                dutyLocation: true,
                isLeave: true,
                hours: true,
                otHours: true,
                holidayId: true,
                startAt: true,
                endAt: true,
                shiftTypeId: true,
                shiftType: {
                  select: {
                    id: true,
                    name: true,
                    chipLabel: true,
                    startTime: true,
                    endTime: true,
                    graceMinutes: true,
                    earlyExitThresholdMinutes: true
                  }
                }
              }
            })
          : Promise.resolve([]),
        shiftTypeIds.length
          ? prisma.shiftType.findMany({
              where: { id: { in: shiftTypeIds } },
              select: {
                id: true,
                name: true,
                chipLabel: true,
                startTime: true,
                endTime: true,
                graceMinutes: true,
                earlyExitThresholdMinutes: true
              }
            })
          : Promise.resolve([])
      ]);

    const staffMap = new Map(staffRows.map((s) => [s.id, s]));
    const allocById = new Map(allocationsById.map((a) => [a.id, a]));
    const allocByStaff = new Map(
      allocationsByStaffDate.map((a) => [a.staffId, a])
    );
    const shiftMap = new Map(shiftTypes.map((s) => [s.id, s]));

    const roomFilter = params.room?.trim() ?? '';
    const statusFilter = params.status?.trim() ?? '';

    const enriched: DailyAttendanceRow[] = [];
    let present = 0;
    let absent = 0;
    let lateCount = 0;
    let earlyOutCount = 0;
    let missingPunches = 0;

    for (const day of days) {
      const staff = staffMap.get(day.staffId);
      const employment = staff ? employmentOf(staff) : {};
      const assignment = staff?.shiftAssignments?.[0];
      const allocation =
        (day.rosterAllocationId
          ? allocById.get(day.rosterAllocationId)
          : undefined) ?? allocByStaff.get(day.staffId);
      const shift =
        allocation?.shiftType ??
        (day.shiftTypeId ? shiftMap.get(day.shiftTypeId) : undefined);

      const roomValue =
        allocation?.unit?.trim() ||
        allocation?.dutyLocation?.trim() ||
        assignment?.unit?.trim() ||
        day.location?.trim() ||
        '';

      if (roomFilter && roomValue !== roomFilter) continue;

      const displayStatus = toDailyDisplayStatus(day.status, day.flags);
      if (!matchesDisplayStatusFilter(displayStatus, statusFilter, day.flags)) {
        continue;
      }

      const designation =
        assignment?.designation?.trim() ||
        employment.staffDesignation?.trim() ||
        '';

      const shiftStart = shift?.startTime ?? '';
      const shiftEnd = shift?.endTime ?? '';
      const shiftName = shift?.chipLabel || shift?.name || '';
      const scheduledShift =
        shiftName && shiftStart && shiftEnd
          ? `${shiftName} ${shiftStart}–${shiftEnd}`
          : shiftName || (shiftStart && shiftEnd ? `${shiftStart}–${shiftEnd}` : '—');

      const lateMinutes = computeLateMinutes(
        day.firstInAt,
        shiftStart,
        shift?.graceMinutes ?? 0
      );
      const earlyOutMinutes = computeEarlyOutMinutes(
        day.lastOutAt,
        shiftEnd,
        shift?.earlyExitThresholdMinutes ?? 0
      );
      const workedMinutes = computeWorkedMinutes(day.firstInAt, day.lastOutAt);

      const source = deriveSource({
        status: day.status,
        firstInAt: day.firstInAt,
        lastOutAt: day.lastOutAt,
        correctionReason: day.correctionReason,
        hasRoster: Boolean(allocation || day.shiftTypeId),
        isLeave: Boolean(allocation?.isLeave),
        holidayId: allocation?.holidayId ?? null
      });

      enriched.push({
        id: day.id,
        staffId: day.staffId,
        staffCode: day.staffCode,
        staffName: day.staffName,
        department: day.department || assignment?.department || '',
        designation,
        date: dateIso,
        dateLabel: formatShortDate(dateIso),
        scheduledShift,
        shiftStart: shiftStart || '—',
        shiftEnd: shiftEnd || '—',
        checkIn: formatHhMm(day.firstInAt),
        checkOut: formatHhMm(day.lastOutAt),
        totalHours: formatDurationMinutes(workedMinutes),
        late: formatDurationMinutes(lateMinutes),
        earlyOut: formatDurationMinutes(earlyOutMinutes),
        overtime: formatOtHours(allocation?.otHours),
        status: displayStatus,
        statusLabel: statusLabel(displayStatus),
        source,
        remarks: deriveRemarks({
          statusId: displayStatus,
          correctionReason: day.correctionReason,
          lateMinutes,
          earlyOutMinutes
        }),
        rosterAllocationId: allocation?.id ?? day.rosterAllocationId ?? null,
        confirmedToRosterAt: day.confirmedToRosterAt?.toISOString() ?? null,
        canConfirmToRoster:
          Boolean(allocation) &&
          !allocation?.isLeave &&
          mapDayStatusToDutyAttendance(day.status, day.flags) != null
      });

      if (displayStatus === 'present') present += 1;
      if (displayStatus === 'absent') absent += 1;
      if (displayStatus === 'late') lateCount += 1;
      if (displayStatus === 'early_out' || day.flags.includes('early_exit')) {
        earlyOutCount += 1;
      }
      if (
        displayStatus === 'missing_punch' ||
        displayStatus === 'incomplete'
      ) {
        missingPunches += 1;
      }
    }

    const rosteredTotal = enriched.length;
    const summary: DailyAttendanceSummary = {
      present,
      presentPct: pct(present, rosteredTotal),
      absent,
      absentPct: pct(absent, rosteredTotal),
      lateEarlyOut: lateCount + earlyOutCount,
      lateCount,
      earlyOutCount,
      missingPunches,
      rosteredTotal
    };

    const totalRecords = enriched.length;
    const skip = (pageNum - 1) * pageSize;
    const rows = enriched.slice(skip, skip + pageSize);
    const filterOptions = await loadFilterOptions(civilDay);

    return {
      success: true,
      data: {
        date: dateIso,
        dateLabel: formatDateLabel(dateIso),
        summary,
        rows,
        totalRecords,
        filterOptions
      }
    };
  } catch (error: any) {
    console.error('getDailyAttendanceRegister error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load daily attendance' }
    };
  }
}

async function loadFilterOptions(
  civilDay: Date
): Promise<DailyAttendanceFilterOptions> {
  const [optionDays, staffRows, shiftTypes, allocRooms, assignUnits] =
    await Promise.all([
      prisma.attendanceDay.findMany({
        where: { date: civilDay },
        select: {
          department: true,
          staffId: true,
          staffCode: true,
          staffName: true,
          location: true
        }
      }),
      prisma.staff.findMany({
        where: { status: 1 },
        select: {
          id: true,
          code: true,
          name: true,
          employmentDetails: true
        },
        orderBy: { name: 'asc' },
        take: 500
      }),
      prisma.shiftType.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, chipLabel: true },
        orderBy: { name: 'asc' }
      }),
      prisma.rosterAllocation.findMany({
        where: { date: civilDay },
        select: { unit: true, dutyLocation: true }
      }),
      prisma.staffShiftAssignment.findMany({
        select: { unit: true },
        distinct: ['unit']
      })
    ]);

  const departments = uniqueStrings([
    ...optionDays.map((d) => d.department),
    ...staffRows.map((s) => employmentOf(s).department)
  ]);

  const designations = uniqueStrings(
    staffRows.map((s) => employmentOf(s).staffDesignation)
  );
  const staffCategories = uniqueStrings(
    staffRows.map((s) => employmentOf(s).staffCategory)
  );

  const rooms = uniqueStrings([
    ...allocRooms.map((u) => u.unit),
    ...allocRooms.map((u) => u.dutyLocation),
    ...assignUnits.map((u) => u.unit),
    ...optionDays.map((d) => d.location)
  ]);

  const dayStaffIds = new Set(optionDays.map((d) => d.staffId));
  const staffOptions =
    dayStaffIds.size > 0
      ? optionDays
          .map((d) => ({
            id: d.staffId,
            name: `${d.staffCode} — ${d.staffName}`
          }))
          .filter(
            (opt, index, arr) =>
              arr.findIndex((o) => o.id === opt.id) === index
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      : staffRows.map((s) => ({
          id: s.id,
          name: `${s.code} — ${s.name}`
        }));

  return {
    institutions: INSTITUTION_OPTIONS,
    departments: departments.map(toOption),
    rooms: rooms.map(toOption),
    staffCategories: staffCategories.map(toOption),
    designations: designations.map(toOption),
    staff: staffOptions,
    shifts: shiftTypes.map((s) => ({
      id: s.id,
      name: s.chipLabel || s.name
    })),
    statuses: DAILY_ATTENDANCE_STATUS_OPTIONS
  };
}

export async function getDailyAttendanceForExport(
  params: GetDailyAttendanceParams
): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  message?: string;
  error?: { message?: string };
}> {
  const result = await getDailyAttendanceRegister({
    ...params,
    page: '1',
    limit: '5000'
  });
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: result.data.rows.map((row) => ({
      staffCode: row.staffCode,
      staffName: row.staffName,
      department: row.department,
      designation: row.designation,
      date: row.dateLabel,
      scheduledShift: row.scheduledShift,
      shiftStart: row.shiftStart,
      shiftEnd: row.shiftEnd,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      totalHours: row.totalHours,
      late: row.late,
      earlyOut: row.earlyOut,
      overtime: row.overtime,
      status: row.statusLabel,
      source: row.source,
      remarks: row.remarks,
      confirmedToRosterAt: row.confirmedToRosterAt ?? ''
    }))
  };
}
