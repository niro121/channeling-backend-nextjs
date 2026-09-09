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
import { formatOvernightMoney } from '@/lib/utils/overnight-shift';
import { saveRosterAllocationDraft } from '@/services/roster-services/shift-roster.service';
import {
  OVERNIGHT_SHIFT_STATUS_OPTIONS,
  OVERNIGHT_ALLOCATION_OPTIONS,
  type GetOvernightShiftsParams,
  type OvernightAllocationDate,
  type OvernightShiftFilterOptions,
  type OvernightShiftFormOptions,
  type OvernightShiftHistoryEntry,
  type OvernightShiftPayload,
  type OvernightShiftRecord,
  type OvernightShiftSummary,
  type RosterFilterOption
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
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  day1Hours: z.number().min(0).optional().nullable(),
  day2Hours: z.number().min(0).optional().nullable(),
  totalHours: z.number().min(0).optional().nullable(),
  attendanceAllocation: z.enum(['shift_start', 'shift_end', 'split_both']).optional().default('shift_start'),
  overnightOt: z.number().min(0).optional().nullable(),
  overnightAllowance: z.number().min(0).optional().nullable(),
  autoSplit: z.boolean().optional().default(true),
  sendToPayroll: z.boolean().optional().default(false),
  remarks: z.string().max(500).optional().nullable()
});

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function startOfDayUtc(dateStr: string): Date {
  const d = parseISO(dateStr.slice(0, 10));
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function toOption(value: string): RosterFilterOption {
  return { id: value, name: value };
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])
  ].sort((a, b) => a.localeCompare(b));
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
  return {
    staffCode: staff.code ?? '',
    staffName: staff.name ?? '',
    department:
      staff.shiftAssignments[0]?.department?.trim() ||
      employment?.department?.trim() ||
      '',
    unit: staff.shiftAssignments[0]?.unit?.trim() || '',
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
  }
): OvernightShiftRecord {
  const startDate = toIsoString(record.startAt ?? record.date);
  const endDate = toIsoString(record.endAt ?? (record.startAt ? addDays(record.startAt, 1) : addDays(record.date, 1)));
  const allocation = (record.attendanceAllocation as OvernightAllocationDate) || 'shift_start';
  return {
    id: record.id,
    staffId: record.staffId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: record.department,
    unit: record.unit,
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
    const mapped = withUsers.map((record) =>
      mapOvernightRecord(record, {
        createdUser: record.createdUser,
        updatedUser: record.updatedUser
      })
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

    return {
      success: true,
      data: {
        departments: uniqueStrings(allocations.map((row) => row.department)).map(
          toOption
        ),
        units: uniqueStrings(allocations.map((row) => row.unit)).map(toOption),
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
    const [staffRecords, shiftTypes] = await Promise.all([
      prisma.staff.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        take:
          Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100,
        select: { id: true, name: true, code: true }
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
      })
    ]);

    return {
      success: true,
      data: {
        staff: staffRecords.map((staff) => ({
          id: staff.id,
          name: staff.code
            ? `${staff.name} (${staff.code})`
            : (staff.name ?? '')
        })),
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

async function applyOvernightExtras(
  allocationId: string,
  data: z.infer<typeof overnightPayloadSchema>,
  shiftType: { startTime: string; endTime: string; durationHours: number },
  user?: AuditUser
) {
  const auditUser = toAuditUser(user);

  let day1 = data.day1Hours;
  let day2 = data.day2Hours;
  let total = data.totalHours;

  if (data.autoSplit) {
    const split = computeSplit(data.startDate, data.startTime || shiftType.startTime, data.endDate, data.endTime || shiftType.endTime);
    day1 = split.day1;
    day2 = split.day2;
    total = split.total;
  }

  const startDt = new Date(data.startDate);
  const [sh, sm] = (data.startTime || shiftType.startTime).split(':').map(Number);
  if (!Number.isNaN(sh) && !Number.isNaN(sm)) startDt.setHours(sh, sm, 0, 0);

  const endDt = new Date(data.endDate);
  const [eh, em] = (data.endTime || shiftType.endTime).split(':').map(Number);
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
  error?: { message?: string; issues?: Record<string, string[]> };
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
    const dutyDate = new Date(
      Date.UTC(
        data.startDate.getFullYear(),
        data.startDate.getMonth(),
        data.startDate.getDate()
      )
    );

    const existing = await prisma.rosterAllocation.findFirst({
      where: { staffId: data.staffId, date: dutyDate },
      select: { id: true }
    });
    if (existing) {
      return {
        success: false,
        error: {
          message: 'A roster allocation already exists for this staff member on that date',
          issues: {
            startDate: ['Select a date with no existing roster cell for this staff member']
          }
        }
      };
    }

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
        comments: data.remarks?.trim() ?? ''
      },
      user
    );

    if (!draftResult.success || !draftResult.data?.id) {
      return {
        success: false,
        error: {
          message: draftResult.error?.message ?? 'Could not create overnight shift allocation',
          issues: draftResult.error?.issues
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
    return {
      success: true,
      data: mapOvernightRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
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
  error?: { message?: string; issues?: Record<string, string[]> };
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
    const dutyDate = new Date(
      Date.UTC(
        data.startDate.getFullYear(),
        data.startDate.getMonth(),
        data.startDate.getDate()
      )
    );

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
          id: { not: id }
        },
        select: { id: true }
      });
      if (duplicate) {
        return {
          success: false,
          error: {
            message:
              'A roster allocation already exists for this staff member on that date',
            issues: { startDate: ['Duplicate staff/date allocation is not allowed'] }
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
          comments: data.remarks?.trim() ?? ''
        },
        user
      );

      if (!draftResult.success) {
        return {
          success: false,
          error: {
            message:
              draftResult.error?.message ?? 'Could not update overnight shift allocation',
            issues: draftResult.error?.issues
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
  return {
    success: true,
    data: mapOvernightRecord(withUsers, {
      createdUser: withUsers.createdUser,
      updatedUser: withUsers.updatedUser
    })
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
  success: boolean;
  data?: Record<string, unknown>[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const where = buildOvernightWhere(params);
    const records = await prisma.rosterAllocation.findMany({
      where,
      select: allocationSelect,
      orderBy: [{ date: 'desc' }, { staffCode: 'asc' }],
      take: 2000
    });

    const statusLabels = Object.fromEntries(
      OVERNIGHT_SHIFT_STATUS_OPTIONS.map((option) => [option.id, option.name])
    );

    return {
      success: true,
      data: records.map((record) => {
        const mapped = mapOvernightRecord(record);
        return {
          staffCode: mapped.staffCode,
          staffName: mapped.staffName,
          department: mapped.department,
          unit: mapped.unit,
          startDate: mapped.startDate ? format(new Date(mapped.startDate), 'yyyy-MM-dd') : '',
          endDate: mapped.endDate ? format(new Date(mapped.endDate), 'yyyy-MM-dd') : '',
          startTime: mapped.startTime,
          endTime: mapped.endTime,
          day1Hours: mapped.day1Hours.toFixed(2),
          day2Hours: mapped.day2Hours.toFixed(2),
          totalHours: mapped.totalHours.toFixed(2),
          attendanceDate: mapped.attendanceDate ? format(new Date(mapped.attendanceDate), 'yyyy-MM-dd') : '',
          overnightOt: mapped.overnightOt.toFixed(2),
          allowance: formatOvernightMoney(mapped.overnightAllowance),
          payrollReady: mapped.payrollReady ? 'Yes' : 'No',
          status: statusLabels[mapped.status] ?? mapped.status,
          updatedBy: record.updatedBy ?? '',
          updatedAt: toIsoString(record.updatedAt),
          createdBy: record.createdBy ?? '',
          createdAt: toIsoString(record.createdAt)
        };
      })
    };
  } catch (error: any) {
    console.error('getOvernightShiftsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export overnight shifts' }
    };
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
