import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import prisma from '@/lib/prisma';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  ATTENDANCE_TIMEZONE,
  colomboDateIsoToUtc,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import {
  DAILY_ATTENDANCE_STATUS_OPTIONS,
  type AttendanceSummaryCards,
  type AttendanceSummaryDetail,
  type AttendanceSummaryDetailDay,
  type AttendanceSummaryFilterOptions,
  type AttendanceSummaryRegister,
  type AttendanceSummaryRow,
  type GetAttendanceSummaryParams,
  type RfidFilterOption
} from '@/types/attendance';
import { toDailyDisplayStatus } from '@/services/attendance-services/daily-attendance.service';

function toOption(value: string): RfidFilterOption {
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

function formatShortDate(dateIso: string): string {
  const d = colomboDateIsoToUtc(dateIso);
  const zoned = new TZDate(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  return format(zoned, 'd MMM yyyy');
}

function formatDayLabel(dateIso: string): string {
  const d = colomboDateIsoToUtc(dateIso);
  const zoned = new TZDate(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  return format(zoned, 'EEE d MMM yyyy');
}

function formatHhMm(instant: Date | null | undefined): string {
  if (!instant) return '—';
  const zoned = new TZDate(instant.getTime(), ATTENDANCE_TIMEZONE);
  return format(zoned, 'HH:mm');
}

function statusLabel(statusId: string): string {
  return (
    DAILY_ATTENDANCE_STATUS_OPTIONS.find((o) => o.id === statusId)?.name ??
    statusId
  );
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
  if (!filterId.trim() || filterId === '__all__') return true;
  const emp = employmentInstitution?.trim() ?? '';
  if (!emp) return false;
  if (emp === filterId) return true;
  const option = INSTITUTION_OPTIONS.find((o) => o.id === filterId);
  if (!option) return false;
  return emp === option.name || emp.includes(option.name);
}

function defaultPeriod(): { fromDate: string; toDate: string } {
  const todayIso = toColomboDateIso(new Date());
  const [y, m] = todayIso.split('-').map(Number);
  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  return { fromDate, toDate: todayIso };
}

function periodLabel(fromDate: string, toDate: string): string {
  const from = colomboDateIsoToUtc(fromDate);
  const zoned = new TZDate(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  if (fromDate.slice(0, 7) === toDate.slice(0, 7)) {
    return format(zoned, 'MMMM yyyy');
  }
  return `${formatShortDate(fromDate)} → ${formatShortDate(toDate)}`;
}

async function resolveStaffIdsForEmploymentFilters(params: {
  institution?: string;
  staffCategory?: string;
  designation?: string;
}): Promise<string[] | null> {
  const needsFilter =
    Boolean(params.institution?.trim() && params.institution !== '__all__') ||
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
        params.institution !== '__all__' &&
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

async function loadFilterOptions(): Promise<AttendanceSummaryFilterOptions> {
  const [staffRows, shiftTypes, departmentsFromDays, locationsFromDays] =
    await Promise.all([
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
      prisma.attendanceDay.findMany({
        select: { department: true },
        distinct: ['department'],
        take: 200
      }),
      prisma.attendanceDay.findMany({
        select: { location: true },
        distinct: ['location'],
        take: 200
      })
    ]);

  const departments = uniqueStrings([
    ...departmentsFromDays.map((d) => d.department),
    ...staffRows.map((s) => employmentOf(s).department)
  ]);
  const designations = uniqueStrings(
    staffRows.map((s) => employmentOf(s).staffDesignation)
  );
  const staffCategories = uniqueStrings(
    staffRows.map((s) => employmentOf(s).staffCategory)
  );
  const rooms = uniqueStrings(locationsFromDays.map((d) => d.location));

  return {
    institutions: INSTITUTION_OPTIONS,
    departments: departments.map(toOption),
    rooms: rooms.map(toOption),
    staffCategories: staffCategories.map(toOption),
    designations: designations.map(toOption),
    staff: staffRows.map((s) => ({
      id: s.id,
      name: `${s.code} — ${s.name}`
    })),
    shifts: shiftTypes.map((s) => ({
      id: s.id,
      name: s.chipLabel?.trim() || s.name
    }))
  };
}

type Accumulators = {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  dayOffDays: number;
  lateCount: number;
  earlyOutCount: number;
  overtimeHours: number;
  missingPunches: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  staffCode: string;
  staffName: string;
  department: string;
};

function emptyAcc(
  staffCode: string,
  staffName: string,
  department: string
): Accumulators {
  return {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    dayOffDays: 0,
    lateCount: 0,
    earlyOutCount: 0,
    overtimeHours: 0,
    missingPunches: 0,
    createdAt: null,
    updatedAt: null,
    createdBy: null,
    updatedBy: null,
    staffCode,
    staffName,
    department
  };
}

function applyDayStatus(acc: Accumulators, displayStatus: string) {
  switch (displayStatus) {
    case 'present':
      acc.workingDays += 1;
      acc.presentDays += 1;
      break;
    case 'late':
      acc.workingDays += 1;
      acc.presentDays += 1;
      acc.lateCount += 1;
      break;
    case 'early_out':
      acc.workingDays += 1;
      acc.presentDays += 1;
      acc.earlyOutCount += 1;
      break;
    case 'half_day':
      acc.workingDays += 1;
      acc.presentDays += 1;
      break;
    case 'absent':
      acc.workingDays += 1;
      acc.absentDays += 1;
      break;
    case 'leave':
      acc.leaveDays += 1;
      break;
    case 'holiday':
      acc.holidayDays += 1;
      break;
    case 'day_off':
      acc.dayOffDays += 1;
      break;
    case 'missing_punch':
    case 'incomplete':
      acc.workingDays += 1;
      acc.missingPunches += 1;
      break;
    default:
      acc.workingDays += 1;
      break;
  }
}

function toIso(value: Date | null): string {
  return value ? value.toISOString() : '';
}

function mapRow(
  staffId: string,
  acc: Accumulators,
  users?: {
    createdUser: AttendanceSummaryRow['createdUser'];
    updatedUser: AttendanceSummaryRow['updatedUser'];
  }
): AttendanceSummaryRow {
  return {
    id: staffId,
    staffId,
    staffCode: acc.staffCode,
    staffName: acc.staffName,
    department: acc.department,
    workingDays: acc.workingDays,
    presentDays: acc.presentDays,
    absentDays: acc.absentDays,
    leaveDays: acc.leaveDays,
    holidayDays: acc.holidayDays,
    dayOffDays: acc.dayOffDays,
    lateCount: acc.lateCount,
    earlyOutCount: acc.earlyOutCount,
    overtimeHours: Math.round(acc.overtimeHours * 10) / 10,
    missingPunches: acc.missingPunches,
    createdAt: toIso(acc.createdAt),
    updatedAt: toIso(acc.updatedAt),
    createdBy: acc.createdBy,
    updatedBy: acc.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildCards(rows: AttendanceSummaryRow[]): AttendanceSummaryCards {
  const totalStaff = rows.length;
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;
  let dayOff = 0;
  let holiday = 0;
  let missingAttendance = 0;
  let overtimeHours = 0;

  for (const row of rows) {
    if (row.presentDays > 0) present += 1;
    if (row.absentDays > 0) absent += 1;
    if (row.lateCount > 0) late += 1;
    if (row.leaveDays > 0) leave += 1;
    if (row.dayOffDays > 0) dayOff += 1;
    if (row.holidayDays > 0) holiday += 1;
    if (row.missingPunches > 0) missingAttendance += 1;
    overtimeHours += row.overtimeHours;
  }

  return {
    totalStaff,
    present,
    presentPct: pct(present, totalStaff),
    absent,
    absentPct: pct(absent, totalStaff),
    late,
    leave,
    dayOff,
    holiday,
    missingAttendance,
    overtimeHours: Math.round(overtimeHours * 10) / 10
  };
}

export async function getAttendanceSummaryRegister(
  params: GetAttendanceSummaryParams = {}
): Promise<{
  success: boolean;
  data?: AttendanceSummaryRegister;
  error?: { message?: string };
}> {
  try {
    const defaults = defaultPeriod();
    const fromDate = params.fromDate?.trim().slice(0, 10) || defaults.fromDate;
    const toDate = params.toDate?.trim().slice(0, 10) || defaults.toDate;

    if (colomboDateIsoToUtc(fromDate).getTime() > colomboDateIsoToUtc(toDate).getTime()) {
      return {
        success: false,
        error: { message: 'From date must be on or before To date' }
      };
    }

    const fromUtc = colomboDateIsoToUtc(fromDate);
    const toUtc = colomboDateIsoToUtc(toDate);
    const pageSize = Math.min(
      Number.parseInt(params.limit || '10', 10) || 10,
      100
    );
    const pageNum = Math.max(Number.parseInt(params.page || '1', 10), 1);

    const filterOptions = await loadFilterOptions();

    const staffIdsFromEmployment = await resolveStaffIdsForEmploymentFilters({
      institution: params.institution,
      staffCategory: params.staffCategory,
      designation: params.designation
    });

    if (staffIdsFromEmployment && staffIdsFromEmployment.length === 0) {
      return {
        success: true,
        data: {
          fromDate,
          toDate,
          periodLabel: periodLabel(fromDate, toDate),
          cards: {
            totalStaff: 0,
            present: 0,
            presentPct: null,
            absent: 0,
            absentPct: null,
            late: 0,
            leave: 0,
            dayOff: 0,
            holiday: 0,
            missingAttendance: 0,
            overtimeHours: 0
          },
          rows: [],
          totalRecords: 0,
          filterOptions
        }
      };
    }

    const dayWhere: Record<string, unknown> = {
      date: { gte: fromUtc, lte: toUtc }
    };
    if (params.department?.trim()) {
      dayWhere.department = params.department.trim();
    }
    if (params.room?.trim()) {
      dayWhere.location = params.room.trim();
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
      orderBy: [{ staffName: 'asc' }, { date: 'asc' }]
    });

    const byStaff = new Map<string, Accumulators>();

    for (const day of days) {
      let acc = byStaff.get(day.staffId);
      if (!acc) {
        acc = emptyAcc(day.staffCode, day.staffName, day.department || '');
        byStaff.set(day.staffId, acc);
      }
      if (!acc.department && day.department) acc.department = day.department;
      if (!acc.staffCode && day.staffCode) acc.staffCode = day.staffCode;
      if (!acc.staffName && day.staffName) acc.staffName = day.staffName;

      const displayStatus = toDailyDisplayStatus(day.status, day.flags);
      applyDayStatus(acc, displayStatus);

      if (!acc.createdAt || day.createdAt < acc.createdAt) {
        acc.createdAt = day.createdAt;
        acc.createdBy = day.createdBy ?? null;
      }
      if (!acc.updatedAt || day.updatedAt > acc.updatedAt) {
        acc.updatedAt = day.updatedAt;
        acc.updatedBy = day.updatedBy ?? null;
      }
    }

    // OT hours from roster allocations in range (when available)
    const staffIds = [...byStaff.keys()];
    if (staffIds.length) {
      const allocations = await prisma.rosterAllocation.findMany({
        where: {
          staffId: { in: staffIds },
          date: { gte: fromUtc, lte: toUtc }
        },
        select: { staffId: true, otHours: true }
      });
      for (const alloc of allocations) {
        const acc = byStaff.get(alloc.staffId);
        if (acc && alloc.otHours > 0) acc.overtimeHours += alloc.otHours;
      }
    }

    let allRows: AttendanceSummaryRow[] = [...byStaff.entries()].map(
      ([staffId, acc]) => mapRow(staffId, acc)
    );

    allRows.sort((a, b) =>
      a.staffName.localeCompare(b.staffName) ||
      a.staffCode.localeCompare(b.staffCode)
    );

    const cards = buildCards(allRows);
    const totalRecords = allRows.length;
    const start = (pageNum - 1) * pageSize;
    const pageRows = allRows.slice(start, start + pageSize);

    const withUsers = await resolveAuthUsers(
      pageRows.map((row) => ({
        ...row,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(0),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(0)
      }))
    );

    const rows: AttendanceSummaryRow[] = withUsers.map((row, index) => ({
      ...pageRows[index]!,
      createdUser: row.createdUser ?? null,
      updatedUser: row.updatedUser ?? null
    }));

    return {
      success: true,
      data: {
        fromDate,
        toDate,
        periodLabel: periodLabel(fromDate, toDate),
        cards,
        rows,
        totalRecords,
        filterOptions
      }
    };
  } catch (error: any) {
    console.error('getAttendanceSummaryRegister error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load attendance summary' }
    };
  }
}

export async function getAttendanceSummaryDetail(input: {
  staffId: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  success: boolean;
  data?: AttendanceSummaryDetail;
  error?: { message?: string };
}> {
  try {
    const defaults = defaultPeriod();
    const fromDate = input.fromDate?.trim().slice(0, 10) || defaults.fromDate;
    const toDate = input.toDate?.trim().slice(0, 10) || defaults.toDate;
    const fromUtc = colomboDateIsoToUtc(fromDate);
    const toUtc = colomboDateIsoToUtc(toDate);

    const [days, staff, allocations] = await Promise.all([
      prisma.attendanceDay.findMany({
        where: {
          staffId: input.staffId,
          date: { gte: fromUtc, lte: toUtc }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.staff.findUnique({
        where: { id: input.staffId },
        select: { id: true, code: true, name: true }
      }),
      prisma.rosterAllocation.findMany({
        where: {
          staffId: input.staffId,
          date: { gte: fromUtc, lte: toUtc }
        },
        select: { date: true, otHours: true, shiftType: { select: { name: true, chipLabel: true } } }
      })
    ]);

    if (!staff && days.length === 0) {
      return { success: false, error: { message: 'Staff not found' } };
    }

    const acc = emptyAcc(
      days[0]?.staffCode || staff?.code || '',
      days[0]?.staffName || staff?.name || '',
      days[0]?.department || ''
    );

    const detailDays: AttendanceSummaryDetailDay[] = days.map((day) => {
      const displayStatus = toDailyDisplayStatus(day.status, day.flags);
      applyDayStatus(acc, displayStatus);
      if (!acc.createdAt || day.createdAt < acc.createdAt) {
        acc.createdAt = day.createdAt;
      }
      if (!acc.updatedAt || day.updatedAt > acc.updatedAt) {
        acc.updatedAt = day.updatedAt;
      }
      const dateIso = toColomboDateIso(day.date);
      return {
        date: dateIso,
        dateLabel: formatDayLabel(dateIso),
        status: displayStatus,
        statusLabel: statusLabel(displayStatus),
        checkIn: formatHhMm(day.firstInAt),
        checkOut: formatHhMm(day.lastOutAt),
        scheduledShift: '—',
        remarks: day.correctionReason?.trim() || '—'
      };
    });

    for (const alloc of allocations) {
      if (alloc.otHours > 0) acc.overtimeHours += alloc.otHours;
      const dateIso = toColomboDateIso(alloc.date);
      const dayRow = detailDays.find((d) => d.date === dateIso);
      if (dayRow && dayRow.scheduledShift === '—') {
        dayRow.scheduledShift =
          alloc.shiftType?.chipLabel || alloc.shiftType?.name || '—';
      }
    }

    const totals = mapRow(input.staffId, acc);

    return {
      success: true,
      data: {
        staffId: input.staffId,
        staffCode: totals.staffCode,
        staffName: totals.staffName,
        department: totals.department,
        fromDate,
        toDate,
        periodLabel: periodLabel(fromDate, toDate),
        totals: {
          workingDays: totals.workingDays,
          presentDays: totals.presentDays,
          absentDays: totals.absentDays,
          leaveDays: totals.leaveDays,
          holidayDays: totals.holidayDays,
          dayOffDays: totals.dayOffDays,
          lateCount: totals.lateCount,
          earlyOutCount: totals.earlyOutCount,
          overtimeHours: totals.overtimeHours,
          missingPunches: totals.missingPunches
        },
        days: detailDays
      }
    };
  } catch (error: any) {
    console.error('getAttendanceSummaryDetail error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load summary detail' }
    };
  }
}

export async function getAttendanceSummaryForExport(
  params: GetAttendanceSummaryParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  message?: string;
  error?: { message?: string };
}> {
  const result = await getAttendanceSummaryRegister({
    ...params,
    page: '1',
    limit: '500'
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
      workingDays: row.workingDays,
      presentDays: row.presentDays,
      absentDays: row.absentDays,
      leaveDays: row.leaveDays,
      holidays: row.holidayDays,
      daysOff: row.dayOffDays,
      lateCount: row.lateCount,
      earlyOutCount: row.earlyOutCount,
      overtimeHours: row.overtimeHours,
      missingPunches: row.missingPunches,
      createdBy: row.createdUser?.name ?? 'Attendance Engine',
      createdAt: row.createdAt,
      updatedBy: row.updatedUser?.name ?? 'Attendance Engine',
      updatedAt: row.updatedAt
    }))
  };
}
