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
import { formatHolidayMoney } from '@/lib/utils/public-holiday-shift';
import { saveRosterAllocationDraft } from '@/services/roster-services/shift-roster.service';
import {
  HOLIDAY_TYPES,
  PUBLIC_HOLIDAY_SHIFT_STATUS_OPTIONS,
  type GetPublicHolidayShiftsParams,
  type PublicHolidayShiftFilterOptions,
  type PublicHolidayShiftFormOptions,
  type PublicHolidayShiftHistoryEntry,
  type PublicHolidayShiftPayload,
  type PublicHolidayShiftRecord,
  type PublicHolidayShiftSummary,
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
  hours: true,
  dutyLocation: true,
  holidayId: true,
  payRate: true,
  holidayAllowance: true,
  grantLieuLeave: true,
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
      durationHours: true
    }
  },
  holiday: {
    select: {
      id: true,
      name: true,
      typeId: true,
      date: true
    }
  }
} as const;

type AllocationEntity = Prisma.RosterAllocationGetPayload<{
  select: typeof allocationSelect;
}>;

const holidayShiftPayloadSchema = z.object({
  holidayId: z.string().min(1, 'Public holiday is required'),
  staffId: z.string().min(1, 'Staff member is required'),
  shiftTypeId: z.string().min(1, 'Shift is required'),
  dutyDate: z.coerce.date(),
  workedHours: z.number().min(0).optional().nullable(),
  payRate: z.string().min(1, 'Pay rate is required'),
  holidayAllowance: z.number().min(0).optional().nullable(),
  dutyLocation: z.string().optional().nullable(),
  grantLieuLeave: z.boolean().optional().default(false),
  sendToPayroll: z.boolean().optional().default(false),
  status: z.string().optional().default('pending_approval'),
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

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  poya: 'Poya',
  mercantile: 'Mercantile',
  public: 'Public'
};

function mapRecord(
  record: AllocationEntity,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): PublicHolidayShiftRecord {
  return {
    id: record.id,
    holidayId: record.holidayId ?? '',
    holidayName: record.holiday?.name ?? '',
    holidayTypeId: record.holiday?.typeId ?? '',
    holidayType: HOLIDAY_TYPE_LABELS[record.holiday?.typeId ?? ''] ?? record.holiday?.typeId ?? '',
    dutyDate: toIsoString(record.date),
    staffId: record.staffId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: record.department,
    unit: record.unit,
    shiftTypeId: record.shiftTypeId,
    shiftLabel: formatShiftLabel(record.shiftType),
    workedHours: record.hours ?? 0,
    payRate: record.payRate ?? '2.00',
    holidayAllowance: record.holidayAllowance ?? 0,
    dutyLocation: record.dutyLocation ?? '',
    lieuLeave: record.grantLieuLeave,
    sendToPayroll: record.sendToPayroll,
    status: record.status as PublicHolidayShiftRecord['status'],
    remarks: record.comments,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function cycleLabel(params: GetPublicHolidayShiftsParams): string {
  if (params.fromDate && params.toDate) {
    return `${params.fromDate} – ${params.toDate}`;
  }
  return `${format(new Date(), 'MMM yyyy')} cycle`;
}

function buildWhere(
  params: GetPublicHolidayShiftsParams
): Prisma.RosterAllocationWhereInput {
  const where: Prisma.RosterAllocationWhereInput = {
    holidayId: { not: null }
  };

  if (params.fromDate || params.toDate) {
    where.date = {};
    if (params.fromDate) where.date.gte = startOfDayUtc(params.fromDate);
    if (params.toDate) where.date.lte = startOfDayUtc(params.toDate);
  }

  if (params.holidayId) where.holidayId = params.holidayId;
  if (params.holidayTypeId) where.holiday = { typeId: params.holidayTypeId };
  if (params.department) where.department = params.department;
  if (params.unit) where.unit = params.unit;
  if (params.payRate) where.payRate = params.payRate;
  if (params.status) where.status = params.status;

  const staffQ = params.search?.trim();
  if (staffQ) {
    where.OR = [
      { staffCode: { contains: staffQ, mode: 'insensitive' } },
      { staffName: { contains: staffQ, mode: 'insensitive' } }
    ];
  }

  return where;
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
  dutyLocation: string;
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
  const unit = staff.shiftAssignments[0]?.unit?.trim() || '';
  return {
    staffCode: staff.code ?? '',
    staffName: staff.name ?? '',
    department:
      staff.shiftAssignments[0]?.department?.trim() ||
      employment?.department?.trim() ||
      '',
    unit,
    roster: employment?.roster?.trim() || '',
    dutyLocation: unit
  };
}

/* ────────────────────── READ ────────────────────── */

export async function getPublicHolidayShifts(params: GetPublicHolidayShiftsParams): Promise<{
  success: boolean;
  data?: { records: PublicHolidayShiftRecord[]; totalRecords: number; summary: PublicHolidayShiftSummary };
  error?: { message?: string };
}> {
  try {
    const pageNumber =
      Number.parseInt(params.page ?? process.env.DEFAULT_PAGE ?? '1', 10) || 1;
    const pageSize = Math.min(
      Number.parseInt(params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10', 10) || 10,
      200
    );
    const skip = (pageNumber - 1) * pageSize;
    const where = buildWhere(params);

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
      mapRecord(record, {
        createdUser: record.createdUser,
        updatedUser: record.updatedUser
      })
    );

    const summaryResult = await getPublicHolidayShiftSummary(params);
    const summary = summaryResult.data ?? {
      holidayDuties: 0,
      cycleLabel: cycleLabel(params),
      staffOnHolidayDuty: 0,
      holidayPayPayableLabel: 'LKR 0.00',
      lieuDaysGranted: 0
    };

    return { success: true, data: { records: mapped, totalRecords, summary } };
  } catch (error: any) {
    console.error('getPublicHolidayShifts error:', error);
    return { success: false, error: { message: error.message || 'Failed to load public holiday shifts' } };
  }
}

export async function getPublicHolidayShiftSummary(
  params: GetPublicHolidayShiftsParams = {}
): Promise<{
  success: boolean;
  data?: PublicHolidayShiftSummary;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const records = await prisma.rosterAllocation.findMany({
      where,
      select: {
        id: true,
        staffId: true,
        holidayAllowance: true,
        grantLieuLeave: true
      }
    });

    const staffIds = new Set(records.map((r) => r.staffId));
    let totalAllowance = 0;
    let lieuDays = 0;

    for (const r of records) {
      totalAllowance += r.holidayAllowance ?? 0;
      if (r.grantLieuLeave) lieuDays += 1;
    }

    const payLabel =
      totalAllowance >= 1_000_000
        ? `LKR ${(totalAllowance / 1_000_000).toFixed(2)} M`
        : `LKR ${formatHolidayMoney(totalAllowance)}`;

    return {
      success: true,
      data: {
        holidayDuties: records.length,
        cycleLabel: cycleLabel(params),
        staffOnHolidayDuty: staffIds.size,
        holidayPayPayableLabel: payLabel,
        lieuDaysGranted: lieuDays
      }
    };
  } catch (error: any) {
    console.error('getPublicHolidayShiftSummary error:', error);
    return { success: false, error: { message: error.message || 'Failed to load summary' } };
  }
}

export async function getPublicHolidayShiftFilterOptions(): Promise<{
  success: boolean;
  data?: PublicHolidayShiftFilterOptions;
  error?: { message?: string };
}> {
  try {
    const [allocations, holidays] = await Promise.all([
      prisma.rosterAllocation.findMany({
        where: { holidayId: { not: null } },
        select: { department: true, unit: true, payRate: true },
        distinct: ['department', 'unit', 'payRate']
      }),
      prisma.holidayCalendar.findMany({
        orderBy: { date: 'desc' },
        select: { id: true, name: true, typeId: true }
      })
    ]);

    return {
      success: true,
      data: {
        holidays: holidays.map((h) => ({ id: h.id, name: h.name })),
        holidayTypes: HOLIDAY_TYPES.map((t) => ({
          id: t,
          name: HOLIDAY_TYPE_LABELS[t] ?? t
        })),
        departments: uniqueStrings(allocations.map((r) => r.department)).map(toOption),
        units: uniqueStrings(allocations.map((r) => r.unit)).map(toOption),
        payRates: uniqueStrings(allocations.map((r) => r.payRate)).map((id) => ({
          id,
          name: `${id}x`
        })),
        statuses: PUBLIC_HOLIDAY_SHIFT_STATUS_OPTIONS
      }
    };
  } catch (error: any) {
    console.error('getPublicHolidayShiftFilterOptions error:', error);
    return { success: false, error: { message: error.message || 'Failed to load filter options' } };
  }
}

export async function getPublicHolidayShiftFormOptions(): Promise<{
  success: boolean;
  data?: PublicHolidayShiftFormOptions;
  error?: { message?: string };
}> {
  try {
    const [holidays, staffRecords, shiftTypes, unitRecords] = await Promise.all([
      prisma.holidayCalendar.findMany({
        orderBy: { date: 'desc' },
        select: { id: true, name: true, typeId: true, date: true }
      }),
      prisma.staff.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        take: Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100,
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
        where: { status: 'active' },
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
      prisma.rosterAllocation.findMany({
        where: { holidayId: { not: null } },
        select: { dutyLocation: true },
        distinct: ['dutyLocation']
      })
    ]);

    const locationSet = new Set(
      unitRecords
        .map((r) => r.dutyLocation?.trim())
        .filter(Boolean) as string[]
    );
    staffRecords.forEach((s) => {
      const unit = s.shiftAssignments[0]?.unit?.trim();
      if (unit) locationSet.add(unit);
    });

    return {
      success: true,
      data: {
        holidays: holidays.map((h) => ({
          id: h.id,
          name: h.name,
          typeId: h.typeId,
          date: format(h.date, 'yyyy-MM-dd')
        })),
        holidayTypes: HOLIDAY_TYPES.map((t) => ({
          id: t,
          name: HOLIDAY_TYPE_LABELS[t] ?? t
        })),
        shifts: shiftTypes.map((s) => ({
          id: s.id,
          name: formatShiftLabel(s),
          workedHours: (s.durationHours ?? 0).toFixed(2)
        })),
        staff: staffRecords.map((s) => {
          const dept =
            s.shiftAssignments[0]?.department?.trim() ||
            (
              s.employmentDetails as {
                employment?: { department?: string };
              } | null
            )?.employment?.department?.trim() ||
            '';
          const unit = s.shiftAssignments[0]?.unit?.trim() || '';
          return {
            id: s.id,
            name: s.code ? `${s.name} (${s.code})` : (s.name ?? ''),
            staffCode: s.code ?? '',
            department: dept,
            unit,
            dutyLocation: unit
          };
        }),
        locations: [...locationSet].sort().map(toOption),
        payRates: [
          { id: '1.50', name: '1.50x' },
          { id: '2.00', name: '2.00x' },
          { id: '2.50', name: '2.50x' }
        ],
        statuses: PUBLIC_HOLIDAY_SHIFT_STATUS_OPTIONS
      }
    };
  } catch (error: any) {
    console.error('getPublicHolidayShiftFormOptions error:', error);
    return { success: false, error: { message: error.message || 'Failed to load form options' } };
  }
}

/* ────────────────────── CREATE ────────────────────── */

export async function createPublicHolidayShift(
  payload: PublicHolidayShiftPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: PublicHolidayShiftRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = holidayShiftPayloadSchema.safeParse(payload);
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
      Date.UTC(data.dutyDate.getFullYear(), data.dutyDate.getMonth(), data.dutyDate.getDate())
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
          issues: { dutyDate: ['Select a date with no existing roster cell for this staff member'] }
        }
      };
    }

    const holiday = await prisma.holidayCalendar.findUnique({
      where: { id: data.holidayId },
      select: { id: true }
    });
    if (!holiday) {
      return { success: false, error: { message: 'Selected holiday not found in Holiday Calendar' } };
    }

    const shiftType = await prisma.shiftType.findUnique({
      where: { id: data.shiftTypeId },
      select: { id: true, durationHours: true }
    });
    if (!shiftType) {
      return { success: false, error: { message: 'Selected shift type not found' } };
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
          message: draftResult.error?.message ?? 'Could not create holiday shift allocation',
          issues: draftResult.error?.issues
        }
      };
    }

    const auditUser = toAuditUser(user);
    await prisma.rosterAllocation.update({
      where: { id: draftResult.data.id },
      data: {
        holidayId: data.holidayId,
        hours: data.workedHours ?? shiftType.durationHours ?? 0,
        payRate: data.payRate,
        holidayAllowance: data.holidayAllowance ?? 0,
        dutyLocation: data.dutyLocation?.trim() || snapshot.dutyLocation,
        grantLieuLeave: data.grantLieuLeave ?? false,
        sendToPayroll: data.sendToPayroll ?? false,
        status: data.status || 'pending_approval',
        updatedBy: auditUser?.id
      }
    });

    return loadRecord(draftResult.data.id);
  } catch (error: any) {
    console.error('createPublicHolidayShift error:', error);
    return { success: false, error: { message: error.message || 'Failed to create holiday shift' } };
  }
}

/* ────────────────────── UPDATE ────────────────────── */

export async function updatePublicHolidayShift(
  id: string,
  payload: PublicHolidayShiftPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: PublicHolidayShiftRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = holidayShiftPayloadSchema.safeParse(payload);
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
      select: {
        ...allocationSelect,
        roster: true
      }
    });
    if (!existing || !existing.holidayId) {
      return { success: false, error: { message: 'Public holiday shift record not found' } };
    }

    const data = parsed.data;
    const dutyDate = new Date(
      Date.UTC(data.dutyDate.getFullYear(), data.dutyDate.getMonth(), data.dutyDate.getDate())
    );

    const structuralChanged =
      data.staffId !== existing.staffId ||
      data.shiftTypeId !== existing.shiftTypeId ||
      dutyDate.getTime() !== existing.date.getTime();

    if (structuralChanged) {
      const lock = await assertWritableAllocation(existing);
      if (!lock.ok) {
        return {
          success: false,
          error: {
            message: PUBLISHED_LOCK_MESSAGE,
            issues: { dutyDate: ['Published roster dates cannot be changed directly'] }
          }
        };
      }

      const duplicate = await prisma.rosterAllocation.findFirst({
        where: { staffId: data.staffId, date: dutyDate, id: { not: id } },
        select: { id: true }
      });
      if (duplicate) {
        return {
          success: false,
          error: {
            message: 'A roster allocation already exists for this staff member on that date',
            issues: { dutyDate: ['Duplicate staff/date allocation is not allowed'] }
          }
        };
      }

      const snapshot = await getStaffSnapshot(data.staffId);
      if (!snapshot) return { success: false, error: { message: 'Staff member not found' } };

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
            message: draftResult.error?.message ?? 'Could not update holiday shift allocation',
            issues: draftResult.error?.issues
          }
        };
      }
    }

    const shiftType = await prisma.shiftType.findUnique({
      where: { id: data.shiftTypeId },
      select: { durationHours: true }
    });

    const auditUser = toAuditUser(user);
    await prisma.rosterAllocation.update({
      where: { id },
      data: {
        holidayId: data.holidayId,
        hours: data.workedHours ?? shiftType?.durationHours ?? 0,
        payRate: data.payRate,
        holidayAllowance: data.holidayAllowance ?? 0,
        dutyLocation: data.dutyLocation?.trim() || '',
        grantLieuLeave: data.grantLieuLeave ?? false,
        sendToPayroll: data.sendToPayroll ?? false,
        status: data.status || 'pending_approval',
        comments: data.remarks?.trim() ?? '',
        updatedBy: auditUser?.id
      }
    });

    return loadRecord(id);
  } catch (error: any) {
    console.error('updatePublicHolidayShift error:', error);
    return { success: false, error: { message: error.message || 'Failed to update holiday shift' } };
  }
}

/* ────────────────────── DELETE ────────────────────── */

export async function deletePublicHolidayShift(
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
        holidayId: true
      }
    });
    if (!allocation?.holidayId) {
      return { success: false, error: { message: 'Public holiday shift record not found' } };
    }

    const lock = await assertWritableAllocation(allocation);
    if (!lock.ok) {
      return { success: false, error: { message: PUBLISHED_LOCK_MESSAGE } };
    }

    await prisma.rosterAllocation.delete({ where: { id } });
    return { success: true, message: 'Holiday shift deleted' };
  } catch (error: any) {
    console.error('deletePublicHolidayShift error:', error);
    return { success: false, error: { message: error.message || 'Failed to delete holiday shift' } };
  }
}

/* ────────────────────── HISTORY ────────────────────── */

const HISTORY_TITLES: Record<string, string> = {
  'shift.holiday.created': 'Holiday shift created',
  'shift.holiday.updated': 'Holiday shift updated',
  'shift.holiday.deleted': 'Holiday shift deleted'
};

export async function getPublicHolidayShiftHistory(id: string): Promise<{
  success: boolean;
  data?: PublicHolidayShiftHistoryEntry[];
  error?: { message?: string };
}> {
  try {
    const record = await prisma.rosterAllocation.findUnique({
      where: { id },
      select: { id: true, staffName: true, staffCode: true, comments: true }
    });
    if (!record) {
      return { success: false, error: { message: 'Holiday shift record not found' } };
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

    const entries: PublicHolidayShiftHistoryEntry[] = withUsers.map((log) => {
      const metadata = (log.metadata ?? {}) as {
        staffName?: string;
        staffCode?: string;
      };
      const label = metadata.staffName || record.staffName;
      return {
        id: log.id,
        title: HISTORY_TITLES[log.action] ?? log.action,
        detail: `${label} (${metadata.staffCode || record.staffCode})`,
        userLabel: log.createdUser?.name || '',
        at: toIsoString(log.createdAt)
      };
    });

    return { success: true, data: entries };
  } catch (error: any) {
    console.error('getPublicHolidayShiftHistory error:', error);
    return { success: false, error: { message: error.message || 'Failed to load history' } };
  }
}

/* ────────────────────── EXPORT ────────────────────── */

export async function getPublicHolidayShiftsForExport(
  params: GetPublicHolidayShiftsParams
): Promise<{
  success: boolean;
  data?: Record<string, string>[];
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const records = await prisma.rosterAllocation.findMany({
      where,
      select: allocationSelect,
      orderBy: [{ date: 'desc' }, { staffCode: 'asc' }],
      take: 5000
    });

    const withUsers = await resolveAuthUsers(records);
    const data = withUsers.map((record) => {
      const mapped = mapRecord(record, {
        createdUser: record.createdUser,
        updatedUser: record.updatedUser
      });
      return {
        staffCode: mapped.staffCode,
        staffName: mapped.staffName,
        department: mapped.department,
        unit: mapped.unit,
        holidayName: mapped.holidayName,
        holidayType: mapped.holidayType,
        dutyDate: mapped.dutyDate ? format(parseISO(mapped.dutyDate.slice(0, 10)), 'yyyy-MM-dd') : '',
        shiftLabel: mapped.shiftLabel,
        workedHours: mapped.workedHours.toFixed(2),
        payRate: `${mapped.payRate}x`,
        holidayAllowance: mapped.holidayAllowance.toFixed(2),
        dutyLocation: mapped.dutyLocation,
        lieuLeave: mapped.lieuLeave ? 'Yes' : 'No',
        sendToPayroll: mapped.sendToPayroll ? 'Yes' : 'No',
        status: mapped.status,
        updatedBy: mapped.updatedUser?.name || '',
        updatedAt: mapped.updatedAt ? format(parseISO(mapped.updatedAt.slice(0, 10)), 'yyyy-MM-dd') : '',
        createdBy: mapped.createdUser?.name || '',
        createdAt: mapped.createdAt ? format(parseISO(mapped.createdAt.slice(0, 10)), 'yyyy-MM-dd') : ''
      };
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('getPublicHolidayShiftsForExport error:', error);
    return { success: false, error: { message: error.message || 'Failed to export holiday shifts' } };
  }
}

/* ────────────────────── HELPERS ────────────────────── */

async function loadRecord(id: string): Promise<{
  success: boolean;
  data?: PublicHolidayShiftRecord;
  error?: { message?: string };
}> {
  const record = await prisma.rosterAllocation.findUnique({
    where: { id },
    select: allocationSelect
  });
  if (!record || !record.holidayId) {
    return { success: false, error: { message: 'Holiday shift record not found' } };
  }
  const [withUsers] = await resolveAuthUsers([record]);
  return {
    success: true,
    data: mapRecord(withUsers, {
      createdUser: withUsers.createdUser,
      updatedUser: withUsers.updatedUser
    })
  };
}
