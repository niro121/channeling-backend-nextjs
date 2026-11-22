'use server';

import { addDays, format, parseISO } from 'date-fns';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import {
  assertStaffDayShiftLimit,
  getShiftsPerPersonPerDayLimit
} from '@/lib/helpers/roster/shifts-per-person-per-day.helper';
import { saveRosterAllocationDraft } from '@/services/roster-services/shift-roster.service';
import { getInstitutionName } from '@/types/institution';
import {
  OVERNIGHT_SHIFT_STATUS_OPTIONS,
  OVERNIGHT_ALLOCATION_OPTIONS,
  type GetOvernightShiftsParams,
  type OvernightAllocationDate,
  type OvernightShiftConflictPreview,
  type OvernightShiftFilterOptions,
  type OvernightShiftFormOptions,
  type OvernightShiftHistoryEntry,
  type OvernightShiftPayload,
  type OvernightShiftRecord,
  type OvernightShiftStaffOption,
  type OvernightShiftSummary
} from '@/types/roster';

const PUBLISHED_LOCK_MESSAGE =
  'This date is already published. Use a roster amendment before changing it.';

const allocationSelect = {
  id: true,
  staffId: true,
  shiftTypeId: true,
  date: true,
  staffCode: true,
  staffName: true,
  department: true,
  unit: true,
  roster: true,
  status: true,
  shiftRosterId: true,
  startAt: true,
  endAt: true,
  day1Hours: true,
  day2Hours: true,
  totalHours: true,
  attendanceAllocation: true,
  otHours: true,
  nightAllowance: true,
  sendToPayroll: true,
  comments: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  shiftType: {
    select: {
      name: true,
      chipLabel: true,
      startTime: true,
      endTime: true,
      durationHours: true,
      isOvernight: true
    }
  }
} as const;

type AllocationEntity = Prisma.RosterAllocationGetPayload<{
  select: typeof allocationSelect;
}>;

const overnightPayloadSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
  shiftTypeId: z.string().min(1, 'Overnight shift type is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  /** Ignored — times always taken from ShiftType master. */
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  day1Hours: z.number().min(0).optional().nullable(),
  day2Hours: z.number().min(0).optional().nullable(),
  totalHours: z.number().min(0).optional().nullable(),
  attendanceAllocation: z.enum(['shift_start', 'shift_end', 'split_both']).optional().default('shift_start'),
  overnightOt: z.number().min(0).optional().nullable(),
  overnightAllowance: z.number().min(0).optional().nullable(),
  autoSplit: z.boolean().optional().default(true),
  sendToPayroll: z.boolean().optional().default(false),
  remarks: z.string().max(500).optional().nullable(),
  acknowledgedWarnings: z.boolean().optional()
});

type OvernightWriteError = {
  message?: string;
  issues?: Record<string, string[]>;
  softWarnings?: string[];
  requiresAck?: boolean;
};

function toDutyDateUtc(value: Date): Date {
  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  );
}

function parseInstitutionId(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  if (value === 'ruhunu_hospitals') return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 3 ? parsed : null;
}

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function startOfDayUtc(dateStr: string): Date {
  const d = parseISO(dateStr.slice(0, 10));
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])
  ].sort((a, b) => a.localeCompare(b));
}

function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

type DeptUnitLabels = {
  departmentNameById: Map<string, string>;
  unitNameById: Map<string, string>;
};

async function resolveDeptUnitLabels(
  departments: Array<string | null | undefined>,
  units: Array<string | null | undefined>
): Promise<DeptUnitLabels> {
  const deptIds = uniqueStrings(departments).filter(isObjectId);
  const unitIds = uniqueStrings(units).filter(isObjectId);
  const [depts, rooms] = await Promise.all([
    deptIds.length
      ? prisma.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true }
        })
      : Promise.resolve([]),
    unitIds.length
      ? prisma.room.findMany({
          where: { id: { in: unitIds } },
          select: { id: true, number: true, code: true }
        })
      : Promise.resolve([])
  ]);

  return {
    departmentNameById: new Map(depts.map((row) => [row.id, row.name])),
    unitNameById: new Map(
      rooms.map((row) => [
        row.id,
        row.code ? `${row.number} (${row.code})` : row.number
      ])
    )
  };
}

function labelOrRaw(
  value: string | null | undefined,
  nameById: Map<string, string>
): string {
  const id = value?.trim() ?? '';
  if (!id) return '';
  return nameById.get(id) ?? id;
}

function formatShiftLabel(input: {
  name: string;
  chipLabel?: string | null;
  startTime?: string;
  endTime?: string;
}): string {
  const name = input.chipLabel || input.name;
  if (input.startTime && input.endTime) {
    return `${name} (${input.startTime}–${input.endTime})`;
  }
  return name;
}

function computeSplit(
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): { day1: number; day2: number; total: number } {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return { day1: 0, day2: 0, total: 0 };

  const start = new Date(startDate);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(endDate);
  end.setHours(eh, em, 0, 0);
  if (end <= start) return { day1: 0, day2: 0, total: 0 };

  const midnight = new Date(start);
  midnight.setHours(24, 0, 0, 0);
  const msPerHour = 3_600_000;

  if (end <= midnight) {
    const total = (end.getTime() - start.getTime()) / msPerHour;
    return { day1: total, day2: 0, total };
  }

  const day1 = (midnight.getTime() - start.getTime()) / msPerHour;
  const day2 = (end.getTime() - midnight.getTime()) / msPerHour;
  return { day1, day2, total: day1 + day2 };
}

async function assertWritableAllocation(allocation: {
  status: string;
  date: Date;
  department: string;
  unit: string;
  roster: string;
  shiftRosterId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (allocation.status === 'published' || allocation.status === 'amended') {
    return { ok: false, message: PUBLISHED_LOCK_MESSAGE };
  }

  const publishedPeriod = await prisma.shiftRoster.findFirst({
    where: {
      department: allocation.department,
      unit: allocation.unit,
      roster: allocation.roster,
      status: 'published',
      fromDate: { lte: allocation.date },
      toDate: { gte: allocation.date }
    },
    select: { id: true }
  });

  if (publishedPeriod && allocation.shiftRosterId === publishedPeriod.id) {
    return { ok: false, message: PUBLISHED_LOCK_MESSAGE };
  }

  return { ok: true };
}

async function getStaffSnapshot(staffId: string): Promise<{
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  roster: string;
} | null> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      code: true,
      name: true,
      employmentDetails: true,
      shiftAssignments: {
        where: { status: 'active' },
        select: { department: true, unit: true },
        take: 1,
        orderBy: { effectiveFrom: 'desc' }
      }
    }
  });
  if (!staff) return null;
  const employment = (staff.employmentDetails as {
    employment?: { department?: string; roster?: string };
  } | null)?.employment;
  const departmentId =
    staff.shiftAssignments[0]?.department?.trim() ||
    employment?.department?.trim() ||
    '';
  const unitId = staff.shiftAssignments[0]?.unit?.trim() || '';
  const labels = await resolveDeptUnitLabels([departmentId], [unitId]);
  return {
    staffCode: staff.code ?? '',
    staffName: staff.name ?? '',
    department: labelOrRaw(departmentId, labels.departmentNameById),
    unit: labelOrRaw(unitId, labels.unitNameById),
    roster: employment?.roster?.trim() || ''
  };
}

function buildOvernightWhere(
  params: GetOvernightShiftsParams
): Prisma.RosterAllocationWhereInput {
  const where: Prisma.RosterAllocationWhereInput = {
    shiftType: { isOvernight: true }
  };

  if (params.fromDate || params.toDate) {
    where.date = {};
    if (params.fromDate) {
      where.date.gte = startOfDayUtc(params.fromDate);
    }
    if (params.toDate) {
      where.date.lte = startOfDayUtc(params.toDate);
    }
  }

  if (params.department) where.department = params.department;
  if (params.unit) where.unit = params.unit;
  if (params.shiftTypeId) where.shiftTypeId = params.shiftTypeId;
  if (params.status) where.status = params.status;
  if (params.allocationDate) where.attendanceAllocation = params.allocationDate;

  const staffQ = params.staffSearch?.trim() || params.search?.trim();
  if (staffQ) {
    where.OR = [
      { staffCode: { contains: staffQ, mode: 'insensitive' } },
      { staffName: { contains: staffQ, mode: 'insensitive' } }
    ];
  }

  return where;
}

function resolveAttendanceDate(
  alloc: OvernightAllocationDate,
  startDate: string,
  endDate: string
): string {
  if (alloc === 'shift_end') return endDate;
  return startDate;
}

function mapOvernightRecord(
  record: AllocationEntity,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  },
  labels?: DeptUnitLabels
): OvernightShiftRecord {
  const startDate = toIsoString(record.startAt ?? record.date);
  const endDate = toIsoString(record.endAt ?? (record.startAt ? addDays(record.startAt, 1) : addDays(record.date, 1)));
  const allocation = (record.attendanceAllocation as OvernightAllocationDate) || 'shift_start';
  return {
    id: record.id,
    staffId: record.staffId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: labels
      ? labelOrRaw(record.department, labels.departmentNameById)
      : record.department,
    unit: labels
      ? labelOrRaw(record.unit, labels.unitNameById)
      : record.unit,
    shiftTypeId: record.shiftTypeId,
    overnightShift: formatShiftLabel(record.shiftType),
    startDate,
    endDate,
    startTime: record.shiftType.startTime,
    endTime: record.shiftType.endTime,
    day1Hours: record.day1Hours ?? 0,
    day2Hours: record.day2Hours ?? 0,
    totalHours: record.totalHours ?? (record.day1Hours ?? 0) + (record.day2Hours ?? 0),
    attendanceAllocation: allocation,
    attendanceDate: resolveAttendanceDate(allocation, startDate, endDate),
    overnightOt: record.otHours ?? 0,
    overnightAllowance: record.nightAllowance ?? 0,
    payrollReady: record.sendToPayroll,
    autoSplit: true,
    status: record.status,
    remarks: record.comments,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function cycleLabel(params: GetOvernightShiftsParams): string {
  if (params.fromDate && params.toDate) {
    return `${params.fromDate} – ${params.toDate}`;
  }
  return format(new Date(), 'MMM yyyy');
}

export async function getOvernightShifts(params: GetOvernightShiftsParams): Promise<{
  success: boolean;
  data?: { records: OvernightShiftRecord[]; totalRecords: number; summary: OvernightShiftSummary };
  error?: { message?: string };
}> {
  try {
    const pageNumber =
      Number.parseInt(params.page ?? process.env.DEFAULT_PAGE ?? '1', 10) || 1;
    const pageSize = Math.min(
      Number.parseInt(
        params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
        10
      ) || 10,
      200
    );
    const skip = (pageNumber - 1) * pageSize;
    const where = buildOvernightWhere(params);

    const [totalRecords, records] = await Promise.all([
      prisma.rosterAllocation.count({ where }),
      prisma.rosterAllocation.findMany({
        where,
        select: allocationSelect,
        orderBy: [{ date: 'desc' }, { staffCode: 'asc' }],
        skip,
        take: pageSize
      })
    ]);

    const withUsers = await resolveAuthUsers(records);
    const labels = await resolveDeptUnitLabels(
      withUsers.map((row) => row.department),
      withUsers.map((row) => row.unit)
    );
    const mapped = withUsers.map((record) =>
      mapOvernightRecord(
        record,
        {
          createdUser: record.createdUser,
          updatedUser: record.updatedUser
        },
        labels
      )
    );

    const summaryResult = await getOvernightShiftSummary(params);
    const summary = summaryResult.data ?? {
      overnightShifts: 0,
      cycleLabel: cycleLabel(params),
      crossMidnightHours: 0,
      overnightOtHours: 0,
      allocationConflicts: 0
    };

    return {
      success: true,
      data: { records: mapped, totalRecords, summary }
    };
  } catch (error: any) {
    console.error('getOvernightShifts error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load overnight shifts' }
    };
  }
}

export async function getOvernightShiftSummary(
  params: GetOvernightShiftsParams = {}
): Promise<{
  success: boolean;
  data?: OvernightShiftSummary;
  error?: { message?: string };
}> {
  try {
    const where = buildOvernightWhere(params);
    const records = await prisma.rosterAllocation.findMany({
      where,
      select: {
        id: true,
        day1Hours: true,
        day2Hours: true,
        totalHours: true,
        otHours: true,
        attendanceAllocation: true,
        startAt: true,
        endAt: true,
        date: true,
        sendToPayroll: true
      }
    });

    let crossMidnightHours = 0;
    let otHours = 0;
    let conflicts = 0;

    for (const r of records) {
      const total = r.totalHours ?? (r.day1Hours ?? 0) + (r.day2Hours ?? 0);
      crossMidnightHours += total;
      otHours += r.otHours ?? 0;
      if (!r.attendanceAllocation) conflicts += 1;
    }

    return {
      success: true,
      data: {
        overnightShifts: records.length,
        cycleLabel: cycleLabel(params),
        crossMidnightHours: Math.round(crossMidnightHours * 100) / 100,
        overnightOtHours: Math.round(otHours * 100) / 100,
        allocationConflicts: conflicts
      }
    };
  } catch (error: any) {
    console.error('getOvernightShiftSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load overnight shift summary' }
    };
  }
}

export async function getOvernightShiftFilterOptions(): Promise<{
  success: boolean;
  data?: OvernightShiftFilterOptions;
  error?: { message?: string };
}> {
  try {
    const allocations = await prisma.rosterAllocation.findMany({
      where: { shiftType: { isOvernight: true } },
      select: { department: true, unit: true, shiftTypeId: true },
      distinct: ['department', 'unit', 'shiftTypeId']
    });

    const shiftTypeIds = [
      ...new Set(allocations.map((row) => row.shiftTypeId).filter(Boolean))
    ];
    const shiftTypes = shiftTypeIds.length
      ? await prisma.shiftType.findMany({
          where: { id: { in: shiftTypeIds }, isOvernight: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            chipLabel: true,
            startTime: true,
            endTime: true
          }
        })
      : [];

    const departmentValues = uniqueStrings(
      allocations.map((row) => row.department)
    );
    const unitValues = uniqueStrings(allocations.map((row) => row.unit));
    const labels = await resolveDeptUnitLabels(departmentValues, unitValues);

    return {
      success: true,
      data: {
        departments: departmentValues.map((value) => ({
          id: value,
          name: labelOrRaw(value, labels.departmentNameById)
        })),
        units: unitValues.map((value) => ({
          id: value,
          name: labelOrRaw(value, labels.unitNameById)
        })),
        shiftTypes: shiftTypes.map((row) => ({
          id: row.id,
          name: formatShiftLabel(row)
        })),
        allocationOptions: OVERNIGHT_ALLOCATION_OPTIONS,
        statuses: OVERNIGHT_SHIFT_STATUS_OPTIONS
      }
    };
  } catch (error: any) {
    console.error('getOvernightShiftFilterOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load filter options' }
    };
  }
}

export async function getOvernightShiftFormOptions(): Promise<{
  success: boolean;
  data?: OvernightShiftFormOptions;
  error?: { message?: string };
}> {
  try {
    const [staffRecords, shiftTypes, departments] = await Promise.all([
      prisma.staff.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          employmentDetails: true,
          shiftAssignments: {
            where: { status: 'active' },
            select: { department: true, unit: true },
            take: 1,
            orderBy: { effectiveFrom: 'desc' }
          }
        }
      }),
      prisma.shiftType.findMany({
        where: { status: 'active', isOvernight: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          chipLabel: true,
          startTime: true,
          endTime: true,
          durationHours: true
        }
      }),
      prisma.department.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, institution: true }
      })
    ]);

    const departmentById = new Map(departments.map((d) => [d.id, d]));
    const departmentsByNameInstitution = new Map(
      departments.map((d) => [`${d.institution}::${d.name.toLowerCase()}`, d])
    );

    const staff: OvernightShiftStaffOption[] = staffRecords.map((record) => {
      const employment = (
        record.employmentDetails as {
          employment?: {
            institution?: string;
            department?: string;
            roster?: string;
          };
        } | null
      )?.employment;
      const institutionNum = parseInstitutionId(employment?.institution);
      const institutionId =
        institutionNum != null ? String(institutionNum) : '';
      const rawDept = employment?.department?.trim() || '';
      const byId = rawDept ? departmentById.get(rawDept) : undefined;
      const byName =
        !byId && rawDept && institutionNum != null
          ? departmentsByNameInstitution.get(
              `${institutionNum}::${rawDept.toLowerCase()}`
            )
          : undefined;
      const workingDept = byId || byName;
      const assignmentDept =
        record.shiftAssignments[0]?.department?.trim() || '';
      const assignmentDeptRow = assignmentDept
        ? departmentById.get(assignmentDept) ||
          (institutionNum != null
            ? departmentsByNameInstitution.get(
                `${institutionNum}::${assignmentDept.toLowerCase()}`
              )
            : undefined)
        : undefined;

      return {
        id: record.id,
        name: record.code
          ? `${record.code} — ${record.name}`
          : (record.name ?? ''),
        staffCode: record.code ?? '',
        institutionId,
        institutionName:
          institutionNum != null ? getInstitutionName(institutionNum) : '',
        workingDepartmentName:
          workingDept?.name || assignmentDeptRow?.name || assignmentDept || '',
        unit: record.shiftAssignments[0]?.unit?.trim() || '',
        roster: employment?.roster?.trim() || ''
      };
    });

    return {
      success: true,
      data: {
        staff,
        shiftTypes: shiftTypes.map((shift) => ({
          id: shift.id,
          name: formatShiftLabel(shift),
          startTime: shift.startTime,
          endTime: shift.endTime,
          allowance: '3200.00'
        }))
      }
    };
  } catch (error: any) {
    console.error('getOvernightShiftFormOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load form options' }
    };
  }
}

export async function getOvernightShiftConflictPreview(input: {
  staffId: string;
  startDate: Date | string;
  shiftTypeId?: string | null;
  excludeAllocationId?: string | null;
}): Promise<{
  success: boolean;
  data?: OvernightShiftConflictPreview;
  error?: { message?: string };
}> {
  try {
    const staffId = input.staffId?.trim();
    if (!staffId || !input.startDate) {
      return {
        success: true,
        data: {
          allocations: [],
          sameShiftTypeExists: false,
          dayLimit: 1,
          existingCount: 0,
          dayLimitReached: false,
          blocksSave: false,
          blockReason: null,
          infoMessage: null
        }
      };
    }

    const raw =
      typeof input.startDate === 'string'
        ? parseISO(String(input.startDate).slice(0, 10))
        : input.startDate;
    const dutyDate = toDutyDateUtc(raw);
    const shiftTypeId = input.shiftTypeId?.trim() || '';
    const excludeId = input.excludeAllocationId?.trim() || null;

    const snapshot = await getStaffSnapshot(staffId);
    const { limit } = await getShiftsPerPersonPerDayLimit(snapshot?.roster);
    const dayLimit = await assertStaffDayShiftLimit({
      staffId,
      date: dutyDate,
      rosterCode: snapshot?.roster,
      excludeAllocationId: excludeId,
      issueField: 'startDate'
    });

    const rows = await prisma.rosterAllocation.findMany({
      where: {
        staffId,
        date: dutyDate,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      select: {
        id: true,
        shiftTypeId: true,
        status: true,
        shiftType: {
          select: {
            name: true,
            chipLabel: true,
            startTime: true,
            endTime: true,
            isOvernight: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const allocations = rows.map((row) => ({
      id: row.id,
      shiftTypeId: row.shiftTypeId,
      shiftLabel: formatShiftLabel(row.shiftType),
      startTime: row.shiftType.startTime,
      endTime: row.shiftType.endTime,
      status: row.status,
      isOvernight: row.shiftType.isOvernight
    }));

    const sameShiftTypeExists = Boolean(
      shiftTypeId &&
        allocations.some((row) => row.shiftTypeId === shiftTypeId)
    );

    let blocksSave = false;
    let blockReason: string | null = null;
    let infoMessage: string | null = null;

    if (sameShiftTypeExists) {
      blocksSave = true;
      blockReason =
        'This staff member already has this overnight shift type on the selected start date.';
    } else if (!dayLimit.ok) {
      blocksSave = true;
      blockReason = dayLimit.message;
    } else if (allocations.length > 0) {
      const labels = allocations
        .map((row) => `${row.shiftLabel} (${row.startTime}–${row.endTime})`)
        .join('; ');
      infoMessage = `Also rostered that day: ${labels}. Day limit ${limit} (currently ${allocations.length}). Overnight spans into the next calendar day.`;
    }

    return {
      success: true,
      data: {
        allocations,
        sameShiftTypeExists,
        dayLimit: limit,
        existingCount: allocations.length,
        dayLimitReached: !dayLimit.ok,
        blocksSave,
        blockReason,
        infoMessage
      }
    };
  } catch (error: any) {
    console.error('getOvernightShiftConflictPreview error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to check overnight shift conflicts'
      }
    };
  }
}

async function applyOvernightExtras(
  allocationId: string,
  data: z.infer<typeof overnightPayloadSchema>,
  shiftType: { startTime: string; endTime: string; durationHours: number },
  user?: AuditUser
) {
  const auditUser = toAuditUser(user);
  // Times always come from ShiftType master (UI disabled; ignore payload times).
  const startTime = shiftType.startTime;
  const endTime = shiftType.endTime;

  let day1 = data.day1Hours;
  let day2 = data.day2Hours;
  let total = data.totalHours;

  if (data.autoSplit) {
    const split = computeSplit(
      data.startDate,
      startTime,
      data.endDate,
      endTime
    );
    day1 = split.day1;
    day2 = split.day2;
    total = split.total;
  }

  const startDt = new Date(data.startDate);
  const [sh, sm] = startTime.split(':').map(Number);
  if (!Number.isNaN(sh) && !Number.isNaN(sm)) startDt.setHours(sh, sm, 0, 0);

  const endDt = new Date(data.endDate);
  const [eh, em] = endTime.split(':').map(Number);
  if (!Number.isNaN(eh) && !Number.isNaN(em)) endDt.setHours(eh, em, 0, 0);

  await prisma.rosterAllocation.update({
    where: { id: allocationId },
    data: {
      startAt: startDt,
      endAt: endDt,
      day1Hours: day1 ?? 0,
      day2Hours: day2 ?? 0,
      totalHours: total ?? (day1 ?? 0) + (day2 ?? 0),
      attendanceAllocation: data.attendanceAllocation ?? 'shift_start',
      otHours: data.overnightOt ?? 0,
      nightAllowance: data.overnightAllowance ?? 0,
      sendToPayroll: data.sendToPayroll ?? false,
      comments: data.remarks?.trim() ?? '',
      updatedBy: auditUser?.id
    }
  });
}

export async function createOvernightShift(
  payload: OvernightShiftPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: OvernightShiftRecord;
  error?: OvernightWriteError;
}> {
  try {
    const parsed = overnightPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const dutyDate = toDutyDateUtc(data.startDate);

    const shiftType = await prisma.shiftType.findUnique({
      where: { id: data.shiftTypeId },
      select: { id: true, startTime: true, endTime: true, durationHours: true, isOvernight: true }
    });
    if (!shiftType?.isOvernight) {
      return {
        success: false,
        error: { message: 'Selected shift type is not flagged as an overnight shift' }
      };
    }

    const snapshot = await getStaffSnapshot(data.staffId);
    if (!snapshot) {
      return { success: false, error: { message: 'Staff member not found' } };
    }

    const sameType = await prisma.rosterAllocation.findFirst({
      where: {
        staffId: data.staffId,
        date: dutyDate,
        shiftTypeId: data.shiftTypeId
      },
      select: { id: true }
    });
    if (sameType) {
      return {
        success: false,
        error: {
          message:
            'This staff member already has this overnight shift type on that date',
          issues: {
            startDate: [
              'Duplicate shift type for the same staff/date is not allowed'
            ]
          }
        }
      };
    }

    const periodFrom = addDays(dutyDate, -dutyDate.getUTCDay());
    const periodTo = addDays(periodFrom, 6);

    const draftResult = await saveRosterAllocationDraft(
      {
        staffId: data.staffId,
        shiftTypeId: data.shiftTypeId,
        rosterDate: dutyDate,
        periodFromDate: periodFrom,
        periodToDate: periodTo,
        department: snapshot.department,
        unit: snapshot.unit,
        roster: snapshot.roster,
        comments: data.remarks?.trim() ?? '',
        acknowledgedWarnings: data.acknowledgedWarnings
      },
      user
    );

    if (!draftResult.success || !draftResult.data?.id) {
      return {
        success: false,
        error: {
          message: draftResult.error?.message ?? 'Could not create overnight shift allocation',
          issues: draftResult.error?.issues,
          softWarnings: draftResult.error?.softWarnings,
          requiresAck: draftResult.error?.requiresAck
        }
      };
    }

    await applyOvernightExtras(draftResult.data.id, data, shiftType, user);

    const record = await prisma.rosterAllocation.findUnique({
      where: { id: draftResult.data.id },
      select: allocationSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Overnight shift could not be loaded after save' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    const labels = await resolveDeptUnitLabels(
      [withUsers.department],
      [withUsers.unit]
    );
    return {
      success: true,
      data: mapOvernightRecord(
        withUsers,
        {
          createdUser: withUsers.createdUser,
          updatedUser: withUsers.updatedUser
        },
        labels
      )
    };
  } catch (error: any) {
    console.error('createOvernightShift error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create overnight shift' }
    };
  }
}

export async function updateOvernightShift(
  id: string,
  payload: OvernightShiftPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: OvernightShiftRecord;
  error?: OvernightWriteError;
}> {
  try {
    const parsed = overnightPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const existing = await prisma.rosterAllocation.findUnique({
      where: { id },
      select: allocationSelect
    });
    if (!existing || !existing.shiftType.isOvernight) {
      return { success: false, error: { message: 'Overnight shift record not found' } };
    }

    const data = parsed.data;
    const shiftType = await prisma.shiftType.findUnique({
      where: { id: data.shiftTypeId },
      select: { id: true, startTime: true, endTime: true, durationHours: true, isOvernight: true }
    });
    if (!shiftType?.isOvernight) {
      return {
        success: false,
        error: { message: 'Selected shift type is not flagged as an overnight shift' }
      };
    }

    const lock = await assertWritableAllocation(existing);
    const dutyDate = toDutyDateUtc(data.startDate);

    const structuralChanged =
      data.staffId !== existing.staffId ||
      data.shiftTypeId !== existing.shiftTypeId ||
      dutyDate.getTime() !== existing.date.getTime();

    if (structuralChanged) {
      if (!lock.ok) {
        return {
          success: false,
          error: {
            message: PUBLISHED_LOCK_MESSAGE,
            issues: {
              startDate: ['Published roster dates cannot be changed directly']
            }
          }
        };
      }

      const duplicate = await prisma.rosterAllocation.findFirst({
        where: {
          staffId: data.staffId,
          date: dutyDate,
          shiftTypeId: data.shiftTypeId,
          id: { not: id }
        },
        select: { id: true }
      });
      if (duplicate) {
        return {
          success: false,
          error: {
            message:
              'This staff member already has this overnight shift type on that date',
            issues: {
              startDate: [
                'Duplicate shift type for the same staff/date is not allowed'
              ]
            }
          }
        };
      }

      const snapshot = await getStaffSnapshot(data.staffId);
      if (!snapshot) {
        return { success: false, error: { message: 'Staff member not found' } };
      }

      const periodFrom = addDays(dutyDate, -dutyDate.getUTCDay());
      const periodTo = addDays(periodFrom, 6);

      const draftResult = await saveRosterAllocationDraft(
        {
          allocationId: id,
          staffId: data.staffId,
          shiftTypeId: data.shiftTypeId,
          rosterDate: dutyDate,
          periodFromDate: periodFrom,
          periodToDate: periodTo,
          department: snapshot.department,
          unit: snapshot.unit,
          roster: snapshot.roster,
          comments: data.remarks?.trim() ?? '',
          acknowledgedWarnings: data.acknowledgedWarnings
        },
        user
      );

      if (!draftResult.success) {
        return {
          success: false,
          error: {
            message:
              draftResult.error?.message ?? 'Could not update overnight shift allocation',
            issues: draftResult.error?.issues,
            softWarnings: draftResult.error?.softWarnings,
            requiresAck: draftResult.error?.requiresAck
          }
        };
      }
    }

    await applyOvernightExtras(id, data, shiftType, user);
    return loadOvernightShiftRecord(id);
  } catch (error: any) {
    console.error('updateOvernightShift error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update overnight shift' }
    };
  }
}

async function loadOvernightShiftRecord(id: string): Promise<{
  success: boolean;
  data?: OvernightShiftRecord;
  error?: { message?: string };
}> {
  const record = await prisma.rosterAllocation.findUnique({
    where: { id },
    select: allocationSelect
  });
  if (!record || !record.shiftType.isOvernight) {
    return { success: false, error: { message: 'Overnight shift record not found' } };
  }
  const [withUsers] = await resolveAuthUsers([record]);
  const labels = await resolveDeptUnitLabels(
    [withUsers.department],
    [withUsers.unit]
  );
  return {
    success: true,
    data: mapOvernightRecord(
      withUsers,
      {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      },
      labels
    )
  };
}

export async function deleteOvernightShift(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    void user;
    const allocation = await prisma.rosterAllocation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        date: true,
        department: true,
        unit: true,
        roster: true,
        shiftRosterId: true,
        shiftType: { select: { isOvernight: true } }
      }
    });
    if (!allocation?.shiftType.isOvernight) {
      return { success: false, error: { message: 'Overnight shift record not found' } };
    }

    const lock = await assertWritableAllocation(allocation);
    if (!lock.ok) {
      return { success: false, error: { message: PUBLISHED_LOCK_MESSAGE } };
    }

    await prisma.rosterAllocation.delete({ where: { id } });
    return { success: true, message: 'Overnight shift deleted' };
  } catch (error: any) {
    console.error('deleteOvernightShift error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete overnight shift' }
    };
  }
}

const HISTORY_TITLES: Record<string, string> = {
  'shift.overnight.created': 'Overnight shift created',
  'shift.overnight.updated': 'Overnight shift updated',
  'shift.overnight.deleted': 'Overnight shift deleted'
};

export async function getOvernightShiftHistory(id: string): Promise<{
  success: boolean;
  data?: OvernightShiftHistoryEntry[];
  error?: { message?: string };
}> {
  try {
    const record = await prisma.rosterAllocation.findUnique({
      where: { id },
      select: { id: true, staffName: true, staffCode: true, comments: true }
    });
    if (!record) {
      return { success: false, error: { message: 'Overnight shift record not found' } };
    }

    const logs = await prisma.activityLog.findMany({
      where: { entityType: 'RosterAllocation', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const withUsers = await resolveAuthUsers(
      logs.map((log) => ({
        ...log,
        createdBy: log.userId,
        updatedBy: null
      }))
    );

    const entries: OvernightShiftHistoryEntry[] = withUsers.map((log) => {
      const metadata = (log.metadata ?? {}) as {
        staffName?: string;
        staffCode?: string;
      };
      const label = metadata.staffName || record.staffName;
      const code = metadata.staffCode || record.staffCode;
      return {
        id: log.id,
        title: HISTORY_TITLES[log.action] ?? 'Overnight shift updated',
        detail: `Overnight duty for ${label} (${code}).`,
        userLabel: log.createdUser?.name ?? '—',
        at: toIsoString(log.createdAt)
      };
    });

    if (entries.length === 0) {
      entries.push({
        id: `${id}-created`,
        title: 'Record on file',
        detail: record.comments || 'Overnight shift allocation.',
        userLabel: 'System',
        at: toIsoString(new Date())
      });
    }

    return { success: true, data: entries };
  } catch (error: any) {
    console.error('getOvernightShiftHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load overnight shift history' }
    };
  }
}

export async function getOvernightShiftsForExport(
  params: GetOvernightShiftsParams
): Promise<{
  data: OvernightShiftRecord[];
  totalRecords: number;
}> {
  try {
    const where = buildOvernightWhere(params);
    const records = await prisma.rosterAllocation.findMany({
      where,
      select: allocationSelect,
      orderBy: [{ date: 'desc' }, { staffCode: 'asc' }]
    });
    const recordsWithUsers = await resolveAuthUsers(records);
    const labels = await resolveDeptUnitLabels(
      recordsWithUsers.map((row) => row.department),
      recordsWithUsers.map((row) => row.unit)
    );
    const data = recordsWithUsers.map((record) =>
      mapOvernightRecord(
        record,
        {
          createdUser: record.createdUser,
          updatedUser: record.updatedUser
        },
        labels
      )
    );
    return {
      data,
      totalRecords: data.length
    };
  } catch (error) {
    console.error('getOvernightShiftsForExport error:', error);
    throw new Error('Error getting data');
  }
}

export async function recalculateOvernightSplits(
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { updated: number };
  error?: { message?: string };
}> {
  try {
    const auditUser = toAuditUser(user);
    const records = await prisma.rosterAllocation.findMany({
      where: { shiftType: { isOvernight: true } },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        date: true,
        shiftType: {
          select: { startTime: true, endTime: true }
        }
      }
    });

    let updated = 0;
    for (const r of records) {
      const startDate = r.startAt ?? r.date;
      const endDate = r.endAt ?? addDays(r.date, 1);
      const split = computeSplit(
        startDate,
        r.shiftType.startTime,
        endDate,
        r.shiftType.endTime
      );
      await prisma.rosterAllocation.update({
        where: { id: r.id },
        data: {
          day1Hours: split.day1,
          day2Hours: split.day2,
          totalHours: split.total,
          updatedBy: auditUser?.id
        }
      });
      updated += 1;
    }

    return { success: true, data: { updated } };
  } catch (error: any) {
    console.error('recalculateOvernightSplits error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to recalculate splits' }
    };
  }
}
