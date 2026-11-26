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
import { formatNightMoney } from '@/lib/utils/night-shift';
import { saveRosterAllocationDraft } from '@/services/roster-services/shift-roster.service';
import { getInstitutionName } from '@/types/institution';
import {
  CONSECUTIVE_NIGHT_LIMIT,
  NIGHT_SHIFT_STATUS_OPTIONS,
  exceedsConsecutiveNightPolicy,
  type GetNightShiftsParams,
  type NightShiftConflictPreview,
  type NightShiftFilterOptions,
  type NightShiftFormOptions,
  type NightShiftHistoryEntry,
  type NightShiftPayload,
  type NightShiftRecord,
  type NightShiftStaffOption,
  type NightShiftSummary,
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
  nightHours: true,
  nightOt: true,
  nightAllowance: true,
  mealAllowance: true,
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
      isNightShift: true
    }
  }
} as const;

type AllocationEntity = Prisma.RosterAllocationGetPayload<{
  select: typeof allocationSelect;
}>;

const nightPayloadSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
  shiftTypeId: z.string().min(1, 'Night shift type is required'),
  shiftDate: z.coerce.date(),
  nightHours: z.number().min(0, 'Night hours cannot be negative').optional().nullable(),
  nightOt: z.number().min(0, 'Night OT hours cannot be negative').optional().nullable(),
  nightAllowance: z
    .number()
    .min(0, 'Night allowance cannot be negative')
    .optional()
    .nullable(),
  mealAllowance: z
    .number()
    .min(0, 'Meal allowance cannot be negative')
    .optional()
    .nullable(),
  sendToPayroll: z.boolean().optional().default(false),
  remarks: z.string().max(500).optional().nullable(),
  acknowledgedWarnings: z.boolean().optional()
});

type NightMutationError = {
  message?: string;
  issues?: Record<string, string[]>;
  softWarnings?: string[];
  requiresAck?: boolean;
};

function parseInstitutionId(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  if (value === 'ruhunu_hospitals') return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 3 ? parsed : null;
}

function toDutyDateUtc(value: Date): Date {
  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  );
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

function defaultNightHours(shiftType: { durationHours: number }): number {
  return shiftType.durationHours ?? 0;
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

function buildNightWhere(
  params: GetNightShiftsParams
): Prisma.RosterAllocationWhereInput {
  const where: Prisma.RosterAllocationWhereInput = {
    shiftType: { isNightShift: true }
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

  const staffQ = params.staffSearch?.trim() || params.search?.trim();
  if (staffQ) {
    where.OR = [
      { staffCode: { contains: staffQ, mode: 'insensitive' } },
      { staffName: { contains: staffQ, mode: 'insensitive' } }
    ];
  }

  return where;
}

async function countConsecutiveNights(
  staffId: string,
  date: Date
): Promise<number> {
  let count = 0;
  let cursor = new Date(date.getTime());

  while (count < 31) {
    const found = await prisma.rosterAllocation.findFirst({
      where: {
        staffId,
        date: cursor,
        shiftType: { isNightShift: true }
      },
      select: { id: true }
    });
    if (!found) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

/** Preview consecutive nights if a night cell is added/kept on `date`. */
async function previewConsecutiveNights(
  staffId: string,
  date: Date,
  excludeAllocationId?: string | null
): Promise<number> {
  let count = 1;
  let cursor = addDays(date, -1);

  while (count < 31) {
    const found = await prisma.rosterAllocation.findFirst({
      where: {
        staffId,
        date: cursor,
        shiftType: { isNightShift: true },
        ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {})
      },
      select: { id: true }
    });
    if (!found) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

async function batchConsecutiveNights(
  records: AllocationEntity[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const record of records) {
    result.set(
      record.id,
      await countConsecutiveNights(record.staffId, record.date)
    );
  }
  return result;
}

function mapNightRecord(
  record: AllocationEntity,
  consecutiveNights: number,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): NightShiftRecord {
  return {
    id: record.id,
    staffId: record.staffId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: record.department,
    unit: record.unit,
    shiftDate: toIsoString(record.date),
    shiftTypeId: record.shiftTypeId,
    nightShift: formatShiftLabel(record.shiftType),
    startTime: record.shiftType.startTime,
    endTime: record.shiftType.endTime,
    nightHours: record.nightHours ?? defaultNightHours(record.shiftType),
    nightOt: record.nightOt ?? 0,
    nightAllowance: record.nightAllowance ?? 0,
    mealAllowance: record.mealAllowance ?? 0,
    consecutiveNights,
    payrollReady: record.sendToPayroll,
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

function cycleLabel(params: GetNightShiftsParams): string {
  if (params.fromDate && params.toDate) {
    return `${params.fromDate} – ${params.toDate}`;
  }
  return format(new Date(), 'MMM yyyy');
}

export async function getNightShifts(params: GetNightShiftsParams): Promise<{
  success: boolean;
  data?: { records: NightShiftRecord[]; totalRecords: number; summary: NightShiftSummary };
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
    const where = buildNightWhere(params);

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

    const consecutiveMap = await batchConsecutiveNights(records);
    const withUsers = await resolveAuthUsers(records);
    const mapped = withUsers.map((record) =>
      mapNightRecord(record, consecutiveMap.get(record.id) ?? 1, {
        createdUser: record.createdUser,
        updatedUser: record.updatedUser
      })
    );

    const summaryResult = await getNightShiftSummary(params);
    const summary = summaryResult.data ?? {
      nightShiftsThisCycle: 0,
      cycleLabel: cycleLabel(params),
      staffOnNightDuty: 0,
      staffUnitsLabel: 'Across all units',
      nightAllowancePayable: '0.00',
      consecutiveNightAlerts: 0
    };

    return {
      success: true,
      data: { records: mapped, totalRecords, summary }
    };
  } catch (error: any) {
    console.error('getNightShifts error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load night shifts' }
    };
  }
}

export async function getNightShiftSummary(
  params: GetNightShiftsParams = {}
): Promise<{
  success: boolean;
  data?: NightShiftSummary;
  error?: { message?: string };
}> {
  try {
    const where = buildNightWhere(params);
    const records = await prisma.rosterAllocation.findMany({
      where,
      select: {
        id: true,
        staffId: true,
        unit: true,
        date: true,
        nightAllowance: true,
        mealAllowance: true,
        sendToPayroll: true
      }
    });

    const consecutiveMap = await batchConsecutiveNights(
      records.map((record) => ({
        ...record,
        shiftTypeId: '',
        staffCode: '',
        staffName: '',
        department: '',
        roster: '',
        status: 'draft',
        shiftRosterId: '',
        nightHours: null,
        nightOt: null,
        comments: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
        shiftType: {
          name: '',
          chipLabel: null,
          startTime: '',
          endTime: '',
          durationHours: 0,
          isNightShift: true
        }
      }))
    );

    const staffIds = new Set(records.map((row) => row.staffId));
    const units = new Set(records.map((row) => row.unit).filter(Boolean));
    let allowanceTotal = 0;
    let alertCount = 0;

    for (const record of records) {
      if (record.sendToPayroll) {
        allowanceTotal +=
          (record.nightAllowance ?? 0) + (record.mealAllowance ?? 0);
      }
      if (exceedsConsecutiveNightPolicy(consecutiveMap.get(record.id) ?? 1)) {
        alertCount += 1;
      }
    }

    return {
      success: true,
      data: {
        nightShiftsThisCycle: records.length,
        cycleLabel: cycleLabel(params),
        staffOnNightDuty: staffIds.size,
        staffUnitsLabel:
          units.size > 0 ? `Across ${units.size} units` : 'Across all units',
        nightAllowancePayable: formatNightMoney(allowanceTotal),
        consecutiveNightAlerts: alertCount
      }
    };
  } catch (error: any) {
    console.error('getNightShiftSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load night shift summary' }
    };
  }
}

export async function getNightShiftFilterOptions(): Promise<{
  success: boolean;
  data?: NightShiftFilterOptions;
  error?: { message?: string };
}> {
  try {
    const allocations = await prisma.rosterAllocation.findMany({
      where: { shiftType: { isNightShift: true } },
      select: { department: true, unit: true, shiftTypeId: true },
      distinct: ['department', 'unit', 'shiftTypeId']
    });

    const shiftTypeIds = [
      ...new Set(allocations.map((row) => row.shiftTypeId).filter(Boolean))
    ];
    const shiftTypes = shiftTypeIds.length
      ? await prisma.shiftType.findMany({
          where: { id: { in: shiftTypeIds }, isNightShift: true },
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
        statuses: NIGHT_SHIFT_STATUS_OPTIONS
      }
    };
  } catch (error: any) {
    console.error('getNightShiftFilterOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load filter options' }
    };
  }
}

export async function getNightShiftFormOptions(): Promise<{
  success: boolean;
  data?: NightShiftFormOptions;
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
        where: { status: 'active', isNightShift: true },
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

    const staff: NightShiftStaffOption[] = staffRecords.map((record) => {
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
          nightHours: (shift.durationHours ?? 0).toFixed(2),
          nightAllowance: '2500.00',
          mealAllowance: '450.00'
        }))
      }
    };
  } catch (error: any) {
    console.error('getNightShiftFormOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load form options' }
    };
  }
}

export async function getNightShiftConflictPreview(input: {
  staffId: string;
  shiftDate: Date | string;
  shiftTypeId?: string | null;
  excludeAllocationId?: string | null;
}): Promise<{
  success: boolean;
  data?: NightShiftConflictPreview;
  error?: { message?: string };
}> {
  try {
    const staffId = input.staffId?.trim();
    if (!staffId || !input.shiftDate) {
      return {
        success: true,
        data: {
          allocations: [],
          sameShiftTypeExists: false,
          dayLimit: 1,
          existingCount: 0,
          dayLimitReached: false,
          consecutiveNightsPreview: 0,
          exceedsConsecutivePolicy: false,
          blocksSave: false,
          blockReason: null,
          infoMessage: null
        }
      };
    }

    const raw =
      typeof input.shiftDate === 'string'
        ? parseISO(String(input.shiftDate).slice(0, 10))
        : input.shiftDate;
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
      issueField: 'shiftDate'
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
            isNightShift: true
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
      isNightShift: row.shiftType.isNightShift
    }));

    const sameShiftTypeExists = Boolean(
      shiftTypeId &&
        allocations.some((row) => row.shiftTypeId === shiftTypeId)
    );
    const consecutiveNightsPreview = await previewConsecutiveNights(
      staffId,
      dutyDate,
      excludeId
    );
    const exceedsConsecutivePolicy = exceedsConsecutiveNightPolicy(
      consecutiveNightsPreview
    );

    let blocksSave = false;
    let blockReason: string | null = null;
    let infoMessage: string | null = null;

    if (sameShiftTypeExists) {
      blocksSave = true;
      blockReason =
        'This staff member already has this night shift type on the selected date.';
    } else if (!dayLimit.ok) {
      blocksSave = true;
      blockReason = dayLimit.message;
    } else if (allocations.length > 0) {
      const labels = allocations
        .map((row) => `${row.shiftLabel} (${row.startTime}–${row.endTime})`)
        .join('; ');
      infoMessage = `Also rostered that day: ${labels}. Day limit ${limit} (currently ${allocations.length}).`;
    }

    if (!blocksSave && exceedsConsecutivePolicy) {
      infoMessage = [
        infoMessage,
        `Consecutive nights would be ${consecutiveNightsPreview} (policy limit ${CONSECUTIVE_NIGHT_LIMIT}).`
      ]
        .filter(Boolean)
        .join(' ');
    }

    return {
      success: true,
      data: {
        allocations,
        sameShiftTypeExists,
        dayLimit: limit,
        existingCount: allocations.length,
        dayLimitReached: !dayLimit.ok,
        consecutiveNightsPreview,
        exceedsConsecutivePolicy,
        blocksSave,
        blockReason,
        infoMessage
      }
    };
  } catch (error: any) {
    console.error('getNightShiftConflictPreview error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to check night shift conflicts' }
    };
  }
}

async function applyNightExtras(
  allocationId: string,
  data: z.infer<typeof nightPayloadSchema>,
  shiftType: { durationHours: number },
  user?: AuditUser
) {
  const auditUser = toAuditUser(user);
  await prisma.rosterAllocation.update({
    where: { id: allocationId },
    data: {
      nightHours: data.nightHours ?? defaultNightHours(shiftType),
      nightOt: data.nightOt ?? 0,
      nightAllowance: data.nightAllowance ?? 0,
      mealAllowance: data.mealAllowance ?? 0,
      sendToPayroll: data.sendToPayroll ?? false,
      comments: data.remarks?.trim() ?? '',
      updatedBy: auditUser?.id
    }
  });
}

export async function createNightShift(
  payload: NightShiftPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: NightShiftRecord;
  error?: NightMutationError;
}> {
  try {
    const parsed = nightPayloadSchema.safeParse(payload);
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
    const dutyDate = toDutyDateUtc(data.shiftDate);

    const shiftType = await prisma.shiftType.findUnique({
      where: { id: data.shiftTypeId },
      select: {
        id: true,
        durationHours: true,
        isNightShift: true,
        startTime: true,
        endTime: true
      }
    });
    if (!shiftType?.isNightShift) {
      return {
        success: false,
        error: { message: 'Selected shift type is not flagged as a night shift' }
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
            'This staff member already has this night shift type on that date',
          issues: {
            shiftDate: [
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
          message:
            draftResult.error?.message ??
            'Could not create night shift allocation',
          issues: draftResult.error?.issues,
          softWarnings: draftResult.error?.softWarnings,
          requiresAck: draftResult.error?.requiresAck
        }
      };
    }

    await applyNightExtras(draftResult.data.id, data, shiftType, user);

    const record = await prisma.rosterAllocation.findUnique({
      where: { id: draftResult.data.id },
      select: allocationSelect
    });
    if (!record) {
      return {
        success: false,
        error: { message: 'Night shift could not be loaded after save' }
      };
    }

    const consecutiveNights = await countConsecutiveNights(
      record.staffId,
      record.date
    );
    const [withUsers] = await resolveAuthUsers([record]);

    return {
      success: true,
      data: mapNightRecord(withUsers, consecutiveNights, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('createNightShift error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create night shift' }
    };
  }
}

export async function updateNightShift(
  id: string,
  payload: NightShiftPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: NightShiftRecord;
  error?: NightMutationError;
}> {
  try {
    const parsed = nightPayloadSchema.safeParse(payload);
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
    if (!existing || !existing.shiftType.isNightShift) {
      return {
        success: false,
        error: { message: 'Night shift record not found' }
      };
    }

    const data = parsed.data;
    const shiftType = await prisma.shiftType.findUnique({
      where: { id: data.shiftTypeId },
      select: {
        id: true,
        durationHours: true,
        isNightShift: true,
        startTime: true,
        endTime: true
      }
    });
    if (!shiftType?.isNightShift) {
      return {
        success: false,
        error: { message: 'Selected shift type is not flagged as a night shift' }
      };
    }

    const lock = await assertWritableAllocation(existing);
    const dutyDate = toDutyDateUtc(data.shiftDate);

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
              shiftDate: ['Published roster dates cannot be changed directly']
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
              'This staff member already has this night shift type on that date',
            issues: {
              shiftDate: [
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
              draftResult.error?.message ??
              'Could not update night shift allocation',
            issues: draftResult.error?.issues,
            softWarnings: draftResult.error?.softWarnings,
            requiresAck: draftResult.error?.requiresAck
          }
        };
      }
    }

    await applyNightExtras(id, data, shiftType, user);
    return loadNightShiftRecord(id);
  } catch (error: any) {
    console.error('updateNightShift error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update night shift' }
    };
  }
}

async function loadNightShiftRecord(id: string): Promise<{
  success: boolean;
  data?: NightShiftRecord;
  error?: { message?: string };
}> {
  const record = await prisma.rosterAllocation.findUnique({
    where: { id },
    select: allocationSelect
  });
  if (!record || !record.shiftType.isNightShift) {
    return { success: false, error: { message: 'Night shift record not found' } };
  }
  const consecutiveNights = await countConsecutiveNights(
    record.staffId,
    record.date
  );
  const [withUsers] = await resolveAuthUsers([record]);
  return {
    success: true,
    data: mapNightRecord(withUsers, consecutiveNights, {
      createdUser: withUsers.createdUser,
      updatedUser: withUsers.updatedUser
    })
  };
}

export async function deleteNightShift(
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
        shiftType: { select: { isNightShift: true } }
      }
    });
    if (!allocation?.shiftType.isNightShift) {
      return { success: false, error: { message: 'Night shift record not found' } };
    }

    const lock = await assertWritableAllocation(allocation);
    if (!lock.ok) {
      return { success: false, error: { message: PUBLISHED_LOCK_MESSAGE } };
    }

    await prisma.rosterAllocation.delete({ where: { id } });
    return { success: true, message: 'Night shift deleted' };
  } catch (error: any) {
    console.error('deleteNightShift error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete night shift' }
    };
  }
}

const HISTORY_TITLES: Record<string, string> = {
  'shift.night.created': 'Night shift created',
  'shift.night.updated': 'Night shift updated',
  'shift.night.deleted': 'Night shift deleted'
};

export async function getNightShiftHistory(id: string): Promise<{
  success: boolean;
  data?: NightShiftHistoryEntry[];
  error?: { message?: string };
}> {
  try {
    const record = await prisma.rosterAllocation.findUnique({
      where: { id },
      select: { id: true, staffName: true, staffCode: true, comments: true }
    });
    if (!record) {
      return { success: false, error: { message: 'Night shift record not found' } };
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

    const entries: NightShiftHistoryEntry[] = withUsers.map((log) => {
      const metadata = (log.metadata ?? {}) as {
        staffName?: string;
        staffCode?: string;
      };
      const label = metadata.staffName || record.staffName;
      const code = metadata.staffCode || record.staffCode;
      return {
        id: log.id,
        title: HISTORY_TITLES[log.action] ?? 'Night shift updated',
        detail: `Night duty for ${label} (${code}).`,
        userLabel: log.createdUser?.name ?? '—',
        at: toIsoString(log.createdAt)
      };
    });

    if (entries.length === 0) {
      entries.push({
        id: `${id}-created`,
        title: 'Record on file',
        detail: record.comments || 'Night shift allocation.',
        userLabel: 'System',
        at: toIsoString(new Date())
      });
    }

    return { success: true, data: entries };
  } catch (error: any) {
    console.error('getNightShiftHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load night shift history' }
    };
  }
}

export async function getNightShiftsForExport(
  params: GetNightShiftsParams
): Promise<{
  data: NightShiftRecord[];
  totalRecords: number;
}> {
  try {
    const where = buildNightWhere(params);
    const records = await prisma.rosterAllocation.findMany({
      where,
      select: allocationSelect,
      orderBy: [{ date: 'desc' }, { staffCode: 'asc' }]
    });
    const consecutiveMap = await batchConsecutiveNights(records);
    const recordsWithUsers = await resolveAuthUsers(records);
    const data = recordsWithUsers.map((record) =>
      mapNightRecord(record, consecutiveMap.get(record.id) ?? 1, {
        createdUser: record.createdUser,
        updatedUser: record.updatedUser
      })
    );
    return {
      data,
      totalRecords: data.length
    };
  } catch (error) {
    console.error('getNightShiftsForExport error:', error);
    throw new Error('Error getting data');
  }
}

