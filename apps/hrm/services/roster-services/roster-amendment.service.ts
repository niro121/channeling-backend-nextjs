'use server';

import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import { authPrisma } from '@archmage/db-auth';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers, type AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { assertLeaveSoftWarn } from '@/lib/helpers/roster/leave-roster-soft-warn.helper';
import { assertWeeklyOffSoftWarn } from '@/lib/helpers/roster/weekly-off-soft-warn.helper';
import {
  assertStaffDayShiftLimit,
  getShiftsPerPersonPerDayLimit
} from '@/lib/helpers/roster/shifts-per-person-per-day.helper';
import { getInstitutionName } from '@/types/institution';
import {
  isRosterAmendmentLocked,
  ROSTER_AMENDMENT_CODE_PREFIX,
  ROSTER_AMENDMENT_STATUSES,
  ROSTER_AMENDMENT_STATUS_OPTIONS,
  ROSTER_AMENDMENT_TYPE_OPTIONS,
  ROSTER_AMENDMENT_TYPES,
  type GetRosterAmendmentsParams,
  type RosterAmendmentAllocationLookup,
  type RosterAmendmentConflictPreview,
  type RosterAmendmentFilterOptions,
  type RosterAmendmentFormOptions,
  type RosterAmendmentHistoryEntry,
  type RosterAmendmentPayload,
  type RosterAmendmentPublishedDuty,
  type RosterAmendmentRecord,
  type RosterAmendmentSummary
} from '@/types/roster';

const AMENDMENT_TYPE_LABELS = Object.fromEntries(
  ROSTER_AMENDMENT_TYPE_OPTIONS.map((option) => [option.id, option.name])
) as Record<string, string>;

const amendmentPayloadSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
  dutyDate: z.coerce.date(),
  originalShiftTypeId: z.string().min(1, 'Original shift is required'),
  amendedShiftTypeId: z.string().optional().nullable(),
  amendmentType: z.enum(ROSTER_AMENDMENT_TYPES),
  swapStaffId: z.string().optional().nullable(),
  dutyLocation: z.string().optional().nullable(),
  dutyLocationDepartmentId: z.string().optional().nullable(),
  dutyZoneId: z.string().optional().nullable(),
  dutyRoomId: z.string().optional().nullable(),
  reason: z.string().min(1, 'Reason for amendment is required').max(500),
  remarks: z.string().max(500).optional().nullable(),
  requestedById: z.string().optional().nullable(),
  status: z.enum(ROSTER_AMENDMENT_STATUSES).optional().default('pending_approval'),
  acknowledgedWarnings: z.boolean().optional()
});

const approveRejectSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one amendment'),
  remarks: z.string().max(500).optional().nullable(),
  acknowledgedWarnings: z.boolean().optional()
});

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function startOfDay(dateStr: string): Date {
  const d = parseISO(dateStr.slice(0, 10));
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function toOption(value: string): { id: string; name: string } {
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

type AmendmentEntity = {
  id: string;
  code: string;
  staffId: string;
  dutyDate: Date;
  originalShiftTypeId: string;
  amendedShiftTypeId: string | null;
  amendmentType: string;
  staffCode: string;
  staffName: string;
  department: string;
  originalShiftLabel: string;
  amendedShiftLabel: string;
  swapStaffId: string | null;
  swapStaffName: string;
  dutyLocation: string;
  dutyLocationDepartmentId: string | null;
  dutyZoneId: string | null;
  dutyRoomId: string | null;
  reason: string;
  remarks: string;
  requestedById: string | null;
  requestedByName: string;
  decidedById: string | null;
  decidedAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
};

function mapAmendmentRecord(
  record: AmendmentEntity,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): RosterAmendmentRecord {
  return {
    id: record.id,
    code: record.code,
    staffId: record.staffId,
    dutyDate: toIsoString(record.dutyDate),
    originalShiftTypeId: record.originalShiftTypeId,
    amendedShiftTypeId: record.amendedShiftTypeId,
    amendmentType: record.amendmentType,
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: record.department,
    originalShiftLabel: record.originalShiftLabel,
    amendedShiftLabel: record.amendedShiftLabel,
    swapStaffId: record.swapStaffId,
    swapStaffName: record.swapStaffName,
    dutyLocation: record.dutyLocation,
    dutyLocationDepartmentId: record.dutyLocationDepartmentId ?? '',
    dutyZoneId: record.dutyZoneId ?? '',
    dutyRoomId: record.dutyRoomId ?? '',
    reason: record.reason,
    remarks: record.remarks,
    requestedById: record.requestedById,
    requestedByName: record.requestedByName,
    decidedById: record.decidedById,
    decidedAt: record.decidedAt ? toIsoString(record.decidedAt) : null,
    status: record.status,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

async function isAllocationPublished(allocation: {
  status: string;
  date: Date;
  department: string;
  unit: string;
  roster: string;
  shiftRosterId: string;
}): Promise<boolean> {
  if (allocation.status === 'published' || allocation.status === 'amended') {
    return true;
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

  return Boolean(
    publishedPeriod && publishedPeriod.id === allocation.shiftRosterId
  );
}

type PublishedAllocationRow = {
  id: string;
  staffId: string;
  shiftTypeId: string;
  status: string;
  date: Date;
  department: string;
  unit: string;
  roster: string;
  shiftRosterId: string;
  dutyLocation: string;
  dutyLocationDepartmentId: string | null;
  dutyZoneId: string | null;
  dutyRoomId: string | null;
  hours: number;
  staffCode: string;
  staffName: string;
  supervisorName: string;
  shiftType: {
    id: string;
    name: string;
    chipLabel: string | null;
    startTime: string;
    endTime: string;
    durationHours: number;
  };
};

async function findPublishedAllocation(
  staffId: string,
  dutyDate: Date,
  shiftTypeId?: string | null
): Promise<PublishedAllocationRow | null> {
  const shiftFilter = shiftTypeId?.trim() || '';
  const allocation = await prisma.rosterAllocation.findFirst({
    where: {
      staffId,
      date: dutyDate,
      ...(shiftFilter ? { shiftTypeId: shiftFilter } : {})
    },
    include: {
      shiftType: {
        select: {
          id: true,
          name: true,
          chipLabel: true,
          startTime: true,
          endTime: true,
          durationHours: true
        }
      }
    },
    orderBy: [{ createdAt: 'asc' }]
  });

  if (!allocation) return null;
  const published = await isAllocationPublished(allocation);
  return published ? allocation : null;
}

async function listPublishedAllocations(
  staffId: string,
  dutyDate: Date
): Promise<PublishedAllocationRow[]> {
  const rows = await prisma.rosterAllocation.findMany({
    where: {
      staffId,
      date: dutyDate
    },
    include: {
      shiftType: {
        select: {
          id: true,
          name: true,
          chipLabel: true,
          startTime: true,
          endTime: true,
          durationHours: true
        }
      }
    },
    orderBy: [{ createdAt: 'asc' }]
  });

  const published: PublishedAllocationRow[] = [];
  for (const row of rows) {
    if (await isAllocationPublished(row)) {
      published.push(row);
    }
  }
  return published;
}

async function mapAllocationToLookup(
  allocation: PublishedAllocationRow
): Promise<RosterAmendmentPublishedDuty> {
  const placeNames = await resolvePlaceNames({
    dutyLocationDepartmentId: allocation.dutyLocationDepartmentId,
    dutyZoneId: allocation.dutyZoneId,
    dutyRoomId: allocation.dutyRoomId
  });

  return {
    allocationId: allocation.id,
    staffId: allocation.staffId,
    staffCode: allocation.staffCode,
    staffName: allocation.staffName,
    dutyDate: toIsoString(allocation.date),
    originalShiftTypeId: allocation.shiftTypeId,
    originalShiftLabel: formatShiftLabel(allocation.shiftType),
    startTime: allocation.shiftType.startTime,
    endTime: allocation.shiftType.endTime,
    department: allocation.department,
    unit: allocation.unit ?? '',
    roster: allocation.roster ?? '',
    dutyLocation: allocation.dutyLocation ?? '',
    dutyLocationDepartmentId: allocation.dutyLocationDepartmentId ?? '',
    dutyLocationDepartmentName: placeNames.dutyLocationDepartmentName,
    dutyZoneId: allocation.dutyZoneId ?? '',
    dutyZoneName: placeNames.dutyZoneName,
    dutyRoomId: allocation.dutyRoomId ?? '',
    dutyRoomName: placeNames.dutyRoomName,
    supervisorName: allocation.supervisorName ?? '',
    status: allocation.status
  };
}

async function resolveRequesterName(requestedById?: string | null): Promise<string> {
  if (!requestedById) return '';
  const user = await authPrisma.user.findUnique({
    where: { id: requestedById },
    select: { name: true }
  });
  return user?.name ?? '';
}

async function resolveShiftLabel(shiftTypeId?: string | null): Promise<string> {
  if (!shiftTypeId) return '';
  const shiftType = await prisma.shiftType.findUnique({
    where: { id: shiftTypeId },
    select: {
      name: true,
      chipLabel: true,
      startTime: true,
      endTime: true
    }
  });
  if (!shiftType) return '';
  return formatShiftLabel(shiftType);
}

function amendmentRequiresAmendedShift(type: string): boolean {
  return ['shift_change', 'extra_duty'].includes(type);
}

/** Staff replacement and shift swap both store the partner in `swapStaffId`. */
function amendmentRequiresSwapStaff(type: string): boolean {
  return type === 'staff_replacement' || type === 'shift_swap';
}

function amendmentRequiresDutyLocation(type: string): boolean {
  return type === 'location_change';
}

function parseInstitutionId(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  if (value === 'ruhunu_hospitals') return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 3 ? parsed : null;
}

async function resolveDutyLocationDepartment(
  departmentId: string | null | undefined
): Promise<
  | { ok: true; id: string | null; name: string }
  | { ok: false; message: string; issues?: Record<string, string[]> }
> {
  const id = departmentId?.trim() || '';
  if (!id) return { ok: true, id: null, name: '' };

  const department = await prisma.department.findUnique({
    where: { id },
    select: { id: true, name: true, status: true }
  });
  if (!department || department.status !== 1) {
    return {
      ok: false,
      message: 'Selected duty department was not found or is unpublished',
      issues: {
        dutyLocationDepartmentId: ['Select a published department']
      }
    };
  }
  return { ok: true, id: department.id, name: department.name };
}

async function resolvePlaceNames(input: {
  dutyLocationDepartmentId?: string | null;
  dutyZoneId?: string | null;
  dutyRoomId?: string | null;
}): Promise<{
  dutyLocationDepartmentName: string;
  dutyZoneName: string;
  dutyRoomName: string;
}> {
  const [department, zone, room] = await Promise.all([
    input.dutyLocationDepartmentId
      ? prisma.department.findUnique({
          where: { id: input.dutyLocationDepartmentId },
          select: { name: true }
        })
      : Promise.resolve(null),
    input.dutyZoneId
      ? prisma.zone.findUnique({
          where: { id: input.dutyZoneId },
          select: { name: true, code: true }
        })
      : Promise.resolve(null),
    input.dutyRoomId
      ? prisma.room.findUnique({
          where: { id: input.dutyRoomId },
          select: { number: true, code: true }
        })
      : Promise.resolve(null)
  ]);

  return {
    dutyLocationDepartmentName: department?.name ?? '',
    dutyZoneName: zone
      ? zone.code
        ? `${zone.code} — ${zone.name}`
        : zone.name
      : '',
    dutyRoomName: room
      ? room.code
        ? `${room.number} (${room.code})`
        : room.number
      : ''
  };
}

async function resolveShiftTimes(shiftTypeId?: string | null): Promise<{
  startTime: string;
  endTime: string;
}> {
  if (!shiftTypeId) return { startTime: '', endTime: '' };
  const shiftType = await prisma.shiftType.findUnique({
    where: { id: shiftTypeId },
    select: { startTime: true, endTime: true }
  });
  return {
    startTime: shiftType?.startTime ?? '',
    endTime: shiftType?.endTime ?? ''
  };
}

async function assertAmendmentSoftWarns(input: {
  staffId: string;
  swapStaffId?: string | null;
  dutyDate: Date;
  acknowledgedWarnings?: boolean;
  amendmentType: string;
  startTime?: string | null;
  endTime?: string | null;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      message: string;
      softWarnings: string[];
      requiresAck: true;
    }
> {
  if (input.acknowledgedWarnings) return { ok: true };

  const softWarnings: string[] = [];
  const primaryLeave = await assertLeaveSoftWarn({
    staffId: input.staffId,
    date: input.dutyDate,
    acknowledgedWarnings: false,
    startTime: input.startTime,
    endTime: input.endTime
  });
  if (!primaryLeave.ok) softWarnings.push(...primaryLeave.softWarnings);

  const primaryWeekly = await assertWeeklyOffSoftWarn({
    staffId: input.staffId,
    date: input.dutyDate,
    acknowledgedWarnings: false
  });
  if (!primaryWeekly.ok) softWarnings.push(...primaryWeekly.softWarnings);

  if (
    input.swapStaffId &&
    (input.amendmentType === 'shift_swap' ||
      input.amendmentType === 'staff_replacement')
  ) {
    const partnerLeave = await assertLeaveSoftWarn({
      staffId: input.swapStaffId,
      date: input.dutyDate,
      acknowledgedWarnings: false,
      staffLabel: 'Partner staff',
      startTime: input.startTime,
      endTime: input.endTime
    });
    if (!partnerLeave.ok) softWarnings.push(...partnerLeave.softWarnings);

    const partnerWeekly = await assertWeeklyOffSoftWarn({
      staffId: input.swapStaffId,
      date: input.dutyDate,
      acknowledgedWarnings: false,
      staffLabel: 'Partner staff'
    });
    if (!partnerWeekly.ok) softWarnings.push(...partnerWeekly.softWarnings);
  }

  if (softWarnings.length === 0) return { ok: true };

  return {
    ok: false,
    message: softWarnings[0] ?? 'Acknowledge warnings to continue',
    softWarnings,
    requiresAck: true
  };
}

async function resolveReplacementStaffLabel(
  staffId?: string | null
): Promise<string> {
  if (!staffId) return '';
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { name: true, code: true }
  });
  if (!staff) return '';
  return staff.code ? `${staff.name} (${staff.code})` : (staff.name ?? '');
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

function buildAmendmentWhere(
  params: GetRosterAmendmentsParams
): Prisma.RosterAmendmentWhereInput {
  const where: Prisma.RosterAmendmentWhereInput = {};

  const amendmentNo = params.amendmentNo?.trim() || params.search?.trim();
  if (amendmentNo) {
    where.code = { contains: amendmentNo, mode: 'insensitive' };
  }

  const staffQ = params.staffSearch?.trim();
  if (staffQ) {
    where.OR = [
      { staffCode: { contains: staffQ, mode: 'insensitive' } },
      { staffName: { contains: staffQ, mode: 'insensitive' } }
    ];
  }

  if (params.staffId) where.staffId = params.staffId;
  if (params.department) where.department = params.department;
  if (params.amendmentType) where.amendmentType = params.amendmentType;
  if (params.status) where.status = params.status;
  if (params.requestedById) where.requestedById = params.requestedById;

  if (params.fromDate || params.toDate) {
    where.dutyDate = {};
    if (params.fromDate) {
      where.dutyDate.gte = startOfDay(params.fromDate);
    }
    if (params.toDate) {
      where.dutyDate.lte = startOfDay(params.toDate);
    }
  }

  return where;
}

export async function getRosterAmendments(
  params: GetRosterAmendmentsParams
): Promise<{
  success: boolean;
  data?: { records: RosterAmendmentRecord[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const pageSize = Math.min(
      Number.parseInt(params.limit || '10', 10) || 10,
      100
    );
    const pageNum = Math.max(Number.parseInt(params.page || '1', 10), 1);
    const skip = (pageNum - 1) * pageSize;
    const where = buildAmendmentWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.rosterAmendment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.rosterAmendment.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: withUsers.map((record) =>
          mapAmendmentRecord(record, {
            createdUser: record.createdUser,
            updatedUser: record.updatedUser
          })
        ),
        totalRecords
      },
      message: 'Roster amendments loaded'
    };
  } catch (error: any) {
    console.error('getRosterAmendments error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load roster amendments' }
    };
  }
}

export async function getRosterAmendmentSummary(): Promise<{
  success: boolean;
  data?: RosterAmendmentSummary;
  error?: { message?: string };
}> {
  try {
    const [totalAmendments, pendingApproval, approved, rejected] =
      await Promise.all([
        prisma.rosterAmendment.count(),
        prisma.rosterAmendment.count({
          where: { status: { in: ['draft', 'pending_approval'] } }
        }),
        prisma.rosterAmendment.count({ where: { status: 'approved' } }),
        prisma.rosterAmendment.count({ where: { status: 'rejected' } })
      ]);

    return {
      success: true,
      data: { totalAmendments, pendingApproval, approved, rejected }
    };
  } catch (error: any) {
    console.error('getRosterAmendmentSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load amendment summary' }
    };
  }
}

export async function getRosterAmendmentFilterOptions(): Promise<{
  success: boolean;
  data?: RosterAmendmentFilterOptions;
  error?: { message?: string };
}> {
  try {
    const [departments, requesterIds] = await Promise.all([
      prisma.rosterAmendment.findMany({
        select: { department: true },
        distinct: ['department']
      }),
      prisma.rosterAmendment.findMany({
        where: { requestedById: { not: null } },
        select: { requestedById: true, requestedByName: true },
        distinct: ['requestedById']
      })
    ]);

    const users =
      requesterIds.length > 0
        ? await authPrisma.user.findMany({
            where: {
              id: {
                in: requesterIds
                  .map((row) => row.requestedById)
                  .filter(Boolean) as string[]
              }
            },
            select: { id: true, name: true }
          })
        : [];

    const requesterMap = new Map(users.map((user) => [user.id, user.name]));

    return {
      success: true,
      data: {
        departments: uniqueStrings(departments.map((row) => row.department)).map(
          toOption
        ),
        amendmentTypes: ROSTER_AMENDMENT_TYPE_OPTIONS,
        statuses: ROSTER_AMENDMENT_STATUS_OPTIONS,
        requesters: requesterIds
          .filter((row) => row.requestedById)
          .map((row) => ({
            id: row.requestedById as string,
            name:
              requesterMap.get(row.requestedById as string) ||
              row.requestedByName ||
              row.requestedById as string
          }))
      }
    };
  } catch (error: any) {
    console.error('getRosterAmendmentFilterOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load filter options' }
    };
  }
}

export async function getRosterAmendmentFormOptions(): Promise<{
  success: boolean;
  data?: RosterAmendmentFormOptions;
  error?: { message?: string };
}> {
  try {
    const [
      allocations,
      shiftTypes,
      users,
      replacementStaffRecords,
      departments,
      zones,
      rooms
    ] = await Promise.all([
      prisma.rosterAllocation.findMany({
        where: { status: { in: ['published', 'amended'] } },
        select: {
          staffId: true,
          staffCode: true,
          staffName: true,
          department: true,
          shiftTypeId: true,
          shiftType: {
            select: {
              name: true,
              chipLabel: true,
              startTime: true,
              endTime: true
            }
          }
        },
        orderBy: { staffCode: 'asc' }
      }),
      prisma.shiftType.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      authPrisma.user.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
        take: 200
      }),
      prisma.staff.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        take:
          Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100,
        select: {
          id: true,
          name: true,
          code: true,
          employmentDetails: true,
          shiftAssignments: {
            where: { status: 'active' },
            select: { department: true },
            take: 1,
            orderBy: { effectiveFrom: 'desc' }
          }
        }
      }),
      prisma.department.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, institution: true }
      }),
      prisma.zone.findMany({
        where: { status: 1 },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true, locationId: true }
      }),
      prisma.room.findMany({
        where: { status: 1 },
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          code: true,
          zoneId: true,
          locationId: true
        }
      })
    ]);

    const departmentById = new Map(
      departments.map((d) => [d.id, d] as const)
    );
    const departmentsByNameInstitution = new Map(
      departments.map(
        (d) => [`${d.institution}::${d.name.trim().toLowerCase()}`, d] as const
      )
    );

    const institutionByStaffId = new Map<string, string>();
    for (const staff of replacementStaffRecords) {
      const employment = (
        staff.employmentDetails as {
          employment?: { institution?: string };
        } | null
      )?.employment;
      const institutionNum = parseInstitutionId(employment?.institution);
      institutionByStaffId.set(
        staff.id,
        institutionNum != null ? String(institutionNum) : ''
      );
    }

    const staffMap = new Map<
      string,
      {
        id: string;
        name: string;
        staffCode: string;
        department: string;
        institutionId: string;
        originalShiftTypeId: string;
        originalShiftLabel: string;
      }
    >();

    for (const allocation of allocations) {
      if (staffMap.has(allocation.staffId)) continue;
      staffMap.set(allocation.staffId, {
        id: allocation.staffId,
        name: `${allocation.staffName} (${allocation.staffCode})`,
        staffCode: allocation.staffCode,
        department: allocation.department,
        institutionId: institutionByStaffId.get(allocation.staffId) ?? '',
        originalShiftTypeId: allocation.shiftTypeId,
        originalShiftLabel: formatShiftLabel(allocation.shiftType)
      });
    }

    return {
      success: true,
      data: {
        staff: [...staffMap.values()],
        replacementStaff: replacementStaffRecords.map((record) => {
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
              ? `${record.name} (${record.code})`
              : (record.name ?? ''),
            staffCode: record.code ?? '',
            institutionId,
            institutionName:
              institutionNum != null ? getInstitutionName(institutionNum) : '',
            workingDepartmentName:
              workingDept?.name ||
              assignmentDeptRow?.name ||
              assignmentDept ||
              '',
            roster: employment?.roster?.trim() || ''
          };
        }),
        shiftTypes: shiftTypes.map((row) => ({ id: row.id, name: row.name })),
        amendmentTypes: ROSTER_AMENDMENT_TYPE_OPTIONS,
        statuses: ROSTER_AMENDMENT_STATUS_OPTIONS,
        requesters: users.map((user) => ({ id: user.id, name: user.name })),
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          institutionId: String(d.institution)
        })),
        zones: zones.map((z) => ({
          id: z.id,
          name: z.code ? `${z.code} — ${z.name}` : z.name,
          locationId: z.locationId
        })),
        rooms: rooms.map((r) => ({
          id: r.id,
          name: r.code ? `${r.number} (${r.code})` : r.number,
          zoneId: r.zoneId,
          locationId: r.locationId
        }))
      }
    };
  } catch (error: any) {
    console.error('getRosterAmendmentFormOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load form options' }
    };
  }
}

export async function lookupPublishedAllocationForAmendment(
  staffId: string,
  dutyDate: Date | string,
  shiftTypeId?: string | null
): Promise<{
  success: boolean;
  data?: RosterAmendmentAllocationLookup;
  error?: { message?: string };
}> {
  try {
    const date =
      dutyDate instanceof Date ? dutyDate : startOfDay(String(dutyDate));
    const allocation = await findPublishedAllocation(
      staffId,
      date,
      shiftTypeId
    );
    if (!allocation) {
      return {
        success: true,
        data: null
      };
    }

    return {
      success: true,
      data: await mapAllocationToLookup(allocation)
    };
  } catch (error: any) {
    console.error('lookupPublishedAllocationForAmendment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to lookup allocation' }
    };
  }
}

export async function listPublishedAllocationsForAmendment(
  staffId: string,
  dutyDate: Date | string
): Promise<{
  success: boolean;
  data?: RosterAmendmentPublishedDuty[];
  error?: { message?: string };
}> {
  try {
    const date =
      dutyDate instanceof Date ? dutyDate : startOfDay(String(dutyDate));
    const rows = await listPublishedAllocations(staffId, date);
    const data = await Promise.all(rows.map((row) => mapAllocationToLookup(row)));
    return { success: true, data };
  } catch (error: any) {
    console.error('listPublishedAllocationsForAmendment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to list published duties' }
    };
  }
}

export async function getRosterAmendmentConflictPreview(input: {
  staffId: string;
  dutyDate: Date | string;
  shiftTypeId?: string | null;
  excludeAllocationId?: string | null;
}): Promise<{
  success: boolean;
  data?: RosterAmendmentConflictPreview;
  error?: { message?: string };
}> {
  try {
    const staffId = input.staffId?.trim();
    if (!staffId || !input.dutyDate) {
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

    const dutyDate =
      input.dutyDate instanceof Date
        ? input.dutyDate
        : startOfDay(String(input.dutyDate));
    const shiftTypeId = input.shiftTypeId?.trim() || '';
    const excludeId = input.excludeAllocationId?.trim() || null;

    const snapshot = await getStaffSnapshot(staffId);
    const { limit } = await getShiftsPerPersonPerDayLimit(snapshot?.roster);
    const dayLimit = await assertStaffDayShiftLimit({
      staffId,
      date: dutyDate,
      rosterCode: snapshot?.roster,
      excludeAllocationId: excludeId,
      issueField: 'dutyDate'
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
            endTime: true
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
      status: row.status
    }));

    const sameShiftTypeExists = Boolean(
      shiftTypeId && allocations.some((row) => row.shiftTypeId === shiftTypeId)
    );

    let blocksSave = false;
    let blockReason: string | null = null;
    let infoMessage: string | null = null;

    if (sameShiftTypeExists) {
      blocksSave = true;
      blockReason =
        'This staff member already has this shift type on the selected date.';
    } else if (!dayLimit.ok) {
      blocksSave = true;
      blockReason = dayLimit.message;
    } else if (allocations.length > 0) {
      const labels = allocations
        .map((row) => `${row.shiftLabel} (${row.startTime}–${row.endTime})`)
        .join('; ');
      infoMessage = `Also rostered that day: ${labels}. Day limit ${limit} (currently ${allocations.length}).`;
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
    console.error('getRosterAmendmentConflictPreview error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to check amendment conflicts' }
    };
  }
}

async function createAmendmentRecord(
  payload: RosterAmendmentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: RosterAmendmentRecord;
  error?: {
    message?: string;
    issues?: Record<string, string[]>;
    softWarnings?: string[];
    requiresAck?: boolean;
  };
}> {
  const parsed = amendmentPayloadSchema.safeParse(payload);
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
  const dutyDate = startOfDay(format(data.dutyDate, 'yyyy-MM-dd'));
  const auditUser = toAuditUser(user);

  if (amendmentRequiresAmendedShift(data.amendmentType) && !data.amendedShiftTypeId) {
    return {
      success: false,
      error: {
        message: 'Amended shift is required for this amendment type',
        issues: { amendedShiftTypeId: ['Amended shift is required'] }
      }
    };
  }

  if (amendmentRequiresSwapStaff(data.amendmentType)) {
    if (!data.swapStaffId) {
      return {
        success: false,
        error: {
          message:
            data.amendmentType === 'shift_swap'
              ? 'Swap partner is required for shift swap'
              : 'Replacement staff is required for staff replacement',
          issues: { swapStaffId: ['This field is required'] }
        }
      };
    }
    if (data.swapStaffId === data.staffId) {
      return {
        success: false,
        error: {
          message: 'Partner staff must be different from the selected staff',
          issues: {
            swapStaffId: ['Must be different from the selected staff']
          }
        }
      };
    }
  }

  let resolvedLocationId: string | null = null;
  let resolvedLocationName = '';
  let resolvedZoneId: string | null = null;
  let resolvedRoomId: string | null = null;

  if (amendmentRequiresDutyLocation(data.amendmentType)) {
    if (!data.dutyLocationDepartmentId?.trim()) {
      return {
        success: false,
        error: {
          message: 'Duty department is required for location change',
          issues: {
            dutyLocationDepartmentId: ['Select a duty department']
          }
        }
      };
    }
    const location = await resolveDutyLocationDepartment(
      data.dutyLocationDepartmentId
    );
    if (!location.ok) {
      return {
        success: false,
        error: { message: location.message, issues: location.issues }
      };
    }
    resolvedLocationId = location.id;
    resolvedLocationName = location.name;
    resolvedZoneId = data.dutyZoneId?.trim() || null;
    resolvedRoomId = data.dutyRoomId?.trim() || null;
  }

  if (data.amendmentType === 'staff_replacement') {
    data.amendedShiftTypeId = data.originalShiftTypeId;
  }

  if (data.amendmentType === 'duty_cancellation' || data.amendmentType === 'location_change') {
    data.amendedShiftTypeId = null;
  }

  if (data.amendmentType === 'shift_swap') {
    if (!data.amendedShiftTypeId?.trim()) {
      return {
        success: false,
        error: {
          message: 'Select the partner duty to swap with',
          issues: { amendedShiftTypeId: ['Select the partner duty'] }
        }
      };
    }
    const partnerAllocation = await findPublishedAllocation(
      data.swapStaffId!,
      dutyDate,
      data.amendedShiftTypeId
    );
    if (!partnerAllocation) {
      return {
        success: false,
        error: {
          message: 'Partner staff has no published duty with the selected shift',
          issues: { amendedShiftTypeId: ['Select a published partner duty'] }
        }
      };
    }
  }

  const allocation = await findPublishedAllocation(
    data.staffId,
    dutyDate,
    data.amendmentType === 'extra_duty' ? null : data.originalShiftTypeId
  );
  if (!allocation && data.amendmentType !== 'extra_duty') {
    return {
      success: false,
      error: {
        message:
          data.amendmentType === 'duty_cancellation'
            ? 'Select a published duty to cancel for this staff and date'
            : 'Select a published duty for this staff and date',
        issues: {
          originalShiftTypeId:
            data.amendmentType === 'duty_cancellation'
              ? ['Select the shift to cancel']
              : ['Select the published duty']
        }
      }
    };
  }

  if (
    data.amendmentType === 'extra_duty' &&
    !allocation &&
    data.amendedShiftTypeId
  ) {
    data.originalShiftTypeId = data.amendedShiftTypeId;
  }

  if (
    allocation &&
    data.amendmentType !== 'extra_duty' &&
    allocation.shiftTypeId !== data.originalShiftTypeId
  ) {
    return {
      success: false,
      error: {
        message: 'Original shift does not match the published roster cell',
        issues: { originalShiftTypeId: ['Original shift mismatch'] }
      }
    };
  }

  const staff = await prisma.staff.findUnique({
    where: { id: data.staffId },
    select: { code: true, name: true }
  });
  if (!staff) {
    return {
      success: false,
      error: { message: 'Staff member not found' }
    };
  }

  const softWarnShiftId =
    data.amendmentType === 'extra_duty' || data.amendmentType === 'shift_change'
      ? data.amendedShiftTypeId || data.originalShiftTypeId
      : data.originalShiftTypeId;
  const softWarnTimes = await resolveShiftTimes(softWarnShiftId);
  const softWarn = await assertAmendmentSoftWarns({
    staffId: data.staffId,
    swapStaffId: data.swapStaffId,
    dutyDate,
    acknowledgedWarnings: data.acknowledgedWarnings,
    amendmentType: data.amendmentType,
    startTime: softWarnTimes.startTime,
    endTime: softWarnTimes.endTime
  });
  if (!softWarn.ok) {
    return {
      success: false,
      error: {
        message: softWarn.message,
        softWarnings: softWarn.softWarnings,
        requiresAck: true
      }
    };
  }

  const generated = await generateRecordCode(ROSTER_AMENDMENT_CODE_PREFIX);
  if (!generated.success) {
    return {
      success: false,
      error: { message: 'Failed to generate amendment code. Please try again.' }
    };
  }

  const [originalShiftLabel, amendedShiftLabel, requestedByName, swapStaffName] =
    await Promise.all([
      data.amendmentType === 'extra_duty' && !allocation
        ? Promise.resolve('—')
        : resolveShiftLabel(data.originalShiftTypeId),
      data.amendmentType === 'staff_replacement'
        ? resolveReplacementStaffLabel(data.swapStaffId)
        : data.amendmentType === 'shift_swap'
          ? resolveShiftLabel(data.amendedShiftTypeId)
          : data.amendmentType === 'duty_cancellation'
            ? Promise.resolve('—')
            : data.amendmentType === 'location_change'
              ? Promise.resolve(resolvedLocationName || '—')
              : resolveShiftLabel(data.amendedShiftTypeId),
      resolveRequesterName(data.requestedById),
      resolveReplacementStaffLabel(data.swapStaffId)
    ]);

  const created = await prisma.rosterAmendment.create({
    data: {
      code: generated.code,
      staffId: data.staffId,
      dutyDate,
      originalShiftTypeId: data.originalShiftTypeId,
      amendedShiftTypeId: data.amendedShiftTypeId ?? null,
      amendmentType: data.amendmentType,
      staffCode: staff.code ?? '',
      staffName: staff.name ?? '',
      department: allocation?.department ?? '',
      originalShiftLabel,
      amendedShiftLabel,
      swapStaffId: data.swapStaffId ?? null,
      swapStaffName,
      dutyLocation: resolvedLocationName || data.dutyLocation?.trim() || '',
      dutyLocationDepartmentId: resolvedLocationId,
      dutyZoneId: resolvedZoneId,
      dutyRoomId: resolvedRoomId,
      reason: data.reason.trim(),
      remarks: data.remarks?.trim() ?? '',
      requestedById: data.requestedById ?? null,
      requestedByName,
      status: data.status ?? 'pending_approval',
      createdBy: auditUser?.id,
      updatedBy: auditUser?.id
    }
  });

  const [withUsers] = await resolveAuthUsers([created]);
  return {
    success: true,
    data: mapAmendmentRecord(withUsers, {
      createdUser: withUsers.createdUser,
      updatedUser: withUsers.updatedUser
    })
  };
}

export async function createRosterAmendment(
  payload: RosterAmendmentPayload,
  user?: AuditUser
) {
  return createAmendmentRecord(payload, user);
}

export async function updateRosterAmendment(
  id: string,
  payload: Partial<RosterAmendmentPayload>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: RosterAmendmentRecord;
  message?: string;
  error?: {
    message?: string;
    issues?: Record<string, string[]>;
    softWarnings?: string[];
    requiresAck?: boolean;
  };
}> {
  try {
    const existing = await prisma.rosterAmendment.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Roster amendment not found' } };
    }
    if (isRosterAmendmentLocked(existing.status)) {
      return {
        success: false,
        error: { message: 'Approved and rejected amendments cannot be edited' }
      };
    }

    const merged: RosterAmendmentPayload = {
      staffId: payload.staffId ?? existing.staffId,
      dutyDate: payload.dutyDate ?? existing.dutyDate,
      originalShiftTypeId:
        payload.originalShiftTypeId ?? existing.originalShiftTypeId,
      amendedShiftTypeId:
        payload.amendedShiftTypeId !== undefined
          ? payload.amendedShiftTypeId
          : existing.amendedShiftTypeId,
      amendmentType: payload.amendmentType ?? existing.amendmentType,
      swapStaffId:
        payload.swapStaffId !== undefined
          ? payload.swapStaffId
          : existing.swapStaffId,
      dutyLocation:
        payload.dutyLocation !== undefined
          ? payload.dutyLocation
          : existing.dutyLocation,
      dutyLocationDepartmentId:
        payload.dutyLocationDepartmentId !== undefined
          ? payload.dutyLocationDepartmentId
          : existing.dutyLocationDepartmentId,
      dutyZoneId:
        payload.dutyZoneId !== undefined
          ? payload.dutyZoneId
          : existing.dutyZoneId,
      dutyRoomId:
        payload.dutyRoomId !== undefined
          ? payload.dutyRoomId
          : existing.dutyRoomId,
      reason: payload.reason ?? existing.reason,
      remarks: payload.remarks !== undefined ? payload.remarks : existing.remarks,
      requestedById:
        payload.requestedById !== undefined
          ? payload.requestedById
          : existing.requestedById,
      status: payload.status ?? existing.status,
      acknowledgedWarnings: payload.acknowledgedWarnings
    };

    const parsed = amendmentPayloadSchema.safeParse(merged);
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
    if (amendmentRequiresAmendedShift(data.amendmentType) && !data.amendedShiftTypeId) {
      return {
        success: false,
        error: {
          message: 'Amended shift is required for this amendment type',
          issues: { amendedShiftTypeId: ['Amended shift is required'] }
        }
      };
    }
    if (amendmentRequiresSwapStaff(data.amendmentType)) {
      if (!data.swapStaffId) {
        return {
          success: false,
          error: {
            message:
              data.amendmentType === 'shift_swap'
                ? 'Swap partner is required for shift swap'
                : 'Replacement staff is required for staff replacement',
            issues: { swapStaffId: ['This field is required'] }
          }
        };
      }
      if (data.swapStaffId === data.staffId) {
        return {
          success: false,
          error: {
            message: 'Partner staff must be different from the selected staff',
            issues: {
              swapStaffId: ['Must be different from the selected staff']
            }
          }
        };
      }
    }
    let resolvedLocationId: string | null = null;
    let resolvedLocationName = '';
    let resolvedZoneId: string | null = null;
    let resolvedRoomId: string | null = null;

    if (amendmentRequiresDutyLocation(data.amendmentType)) {
      if (!data.dutyLocationDepartmentId?.trim()) {
        return {
          success: false,
          error: {
            message: 'Duty department is required for location change',
            issues: {
              dutyLocationDepartmentId: ['Select a duty department']
            }
          }
        };
      }
      const location = await resolveDutyLocationDepartment(
        data.dutyLocationDepartmentId
      );
      if (!location.ok) {
        return {
          success: false,
          error: { message: location.message, issues: location.issues }
        };
      }
      resolvedLocationId = location.id;
      resolvedLocationName = location.name;
      resolvedZoneId = data.dutyZoneId?.trim() || null;
      resolvedRoomId = data.dutyRoomId?.trim() || null;
    }

    if (data.amendmentType === 'staff_replacement') {
      data.amendedShiftTypeId = data.originalShiftTypeId;
    }
    if (
      data.amendmentType === 'duty_cancellation' ||
      data.amendmentType === 'location_change'
    ) {
      data.amendedShiftTypeId = null;
    }
    const dutyDate = startOfDay(format(data.dutyDate, 'yyyy-MM-dd'));
    const auditUser = toAuditUser(user);

    if (data.amendmentType === 'shift_swap') {
      if (!data.amendedShiftTypeId?.trim()) {
        return {
          success: false,
          error: {
            message: 'Select the partner duty to swap with',
            issues: { amendedShiftTypeId: ['Select the partner duty'] }
          }
        };
      }
      const partnerAllocation = await findPublishedAllocation(
        data.swapStaffId!,
        dutyDate,
        data.amendedShiftTypeId
      );
      if (!partnerAllocation) {
        return {
          success: false,
          error: {
            message:
              'Partner staff has no published duty with the selected shift',
            issues: { amendedShiftTypeId: ['Select a published partner duty'] }
          }
        };
      }
    }

    const allocation = await findPublishedAllocation(
      data.staffId,
      dutyDate,
      data.amendmentType === 'extra_duty' ? null : data.originalShiftTypeId
    );
    if (
      !allocation &&
      data.amendmentType !== 'extra_duty'
    ) {
      return {
        success: false,
        error: {
          message:
            data.amendmentType === 'duty_cancellation'
              ? 'Select a published duty to cancel for this staff and date'
              : 'Select a published duty for this staff and date',
          issues: {
            originalShiftTypeId:
              data.amendmentType === 'duty_cancellation'
                ? ['Select the shift to cancel']
                : ['Select the published duty']
          }
        }
      };
    }
    if (
      data.amendmentType === 'extra_duty' &&
      !allocation &&
      data.amendedShiftTypeId
    ) {
      data.originalShiftTypeId = data.amendedShiftTypeId;
    }

    const softWarnShiftId =
      data.amendmentType === 'extra_duty' || data.amendmentType === 'shift_change'
        ? data.amendedShiftTypeId || data.originalShiftTypeId
        : data.originalShiftTypeId;
    const softWarnTimes = await resolveShiftTimes(softWarnShiftId);
    const softWarn = await assertAmendmentSoftWarns({
      staffId: data.staffId,
      swapStaffId: data.swapStaffId,
      dutyDate,
      acknowledgedWarnings: data.acknowledgedWarnings,
      amendmentType: data.amendmentType,
      startTime: softWarnTimes.startTime,
      endTime: softWarnTimes.endTime
    });
    if (!softWarn.ok) {
      return {
        success: false,
        error: {
          message: softWarn.message,
          softWarnings: softWarn.softWarnings,
          requiresAck: true
        }
      };
    }

    const [originalShiftLabel, amendedShiftLabel, requestedByName, swapStaffName] =
      await Promise.all([
        data.amendmentType === 'extra_duty' && !allocation
          ? Promise.resolve('—')
          : resolveShiftLabel(data.originalShiftTypeId),
        data.amendmentType === 'staff_replacement'
          ? resolveReplacementStaffLabel(data.swapStaffId)
          : data.amendmentType === 'shift_swap'
            ? resolveShiftLabel(data.amendedShiftTypeId)
            : data.amendmentType === 'duty_cancellation'
              ? Promise.resolve('—')
              : data.amendmentType === 'location_change'
                ? Promise.resolve(resolvedLocationName || '—')
                : resolveShiftLabel(data.amendedShiftTypeId),
        resolveRequesterName(data.requestedById),
        resolveReplacementStaffLabel(data.swapStaffId)
      ]);

    const updated = await prisma.rosterAmendment.update({
      where: { id },
      data: {
        staffId: data.staffId,
        dutyDate,
        originalShiftTypeId: data.originalShiftTypeId,
        amendedShiftTypeId: data.amendedShiftTypeId ?? null,
        amendmentType: data.amendmentType,
        originalShiftLabel,
        amendedShiftLabel,
        swapStaffId: data.swapStaffId ?? null,
        swapStaffName,
        dutyLocation: resolvedLocationName || data.dutyLocation?.trim() || '',
        dutyLocationDepartmentId: resolvedLocationId,
        dutyZoneId: resolvedZoneId,
        dutyRoomId: resolvedRoomId,
        reason: data.reason.trim(),
        remarks: data.remarks?.trim() ?? '',
        requestedById: data.requestedById ?? null,
        requestedByName,
        status: data.status ?? existing.status,
        updatedBy: auditUser?.id
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapAmendmentRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      }),
      message: 'Roster amendment updated'
    };
  } catch (error: any) {
    console.error('updateRosterAmendment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update roster amendment' }
    };
  }
}

export async function deleteRosterAmendment(
  id: string
): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const existing = await prisma.rosterAmendment.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Roster amendment not found' } };
    }
    if (isRosterAmendmentLocked(existing.status)) {
      return {
        success: false,
        error: { message: 'Approved and rejected amendments cannot be deleted' }
      };
    }

    await prisma.rosterAmendment.delete({ where: { id } });
    return { success: true, message: 'Roster amendment deleted' };
  } catch (error: any) {
    console.error('deleteRosterAmendment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete roster amendment' }
    };
  }
}

async function applyApprovedAmendment(
  amendment: AmendmentEntity,
  user: AuditUser | undefined,
  tx: Prisma.TransactionClient
): Promise<void> {
  const dutyDate = amendment.dutyDate;
  const auditUserId = user?.id;

  if (amendment.amendmentType === 'duty_cancellation') {
    const allocation = await findPublishedAllocation(
      amendment.staffId,
      dutyDate,
      amendment.originalShiftTypeId
    );
    if (!allocation) {
      throw new Error('Published allocation not found for cancellation');
    }
    await tx.rosterAllocation.delete({ where: { id: allocation.id } });
    return;
  }

  if (
    amendment.amendmentType === 'staff_replacement' &&
    amendment.swapStaffId
  ) {
    const allocation = await findPublishedAllocation(
      amendment.staffId,
      dutyDate,
      amendment.originalShiftTypeId
    );
    if (!allocation) {
      throw new Error('Published allocation not found for staff replacement');
    }

    const occupied = await tx.rosterAllocation.findFirst({
      where: {
        staffId: amendment.swapStaffId,
        date: dutyDate,
        id: { not: allocation.id }
      },
      select: { id: true }
    });
    if (occupied) {
      throw new Error(
        'Replacement staff already has a roster allocation on this date'
      );
    }

    const snapshot = await getStaffSnapshot(amendment.swapStaffId);
    if (!snapshot) {
      throw new Error('Replacement staff not found');
    }

    await tx.rosterAllocation.update({
      where: { id: allocation.id },
      data: {
        staffId: amendment.swapStaffId,
        staffCode: snapshot.staffCode,
        staffName: snapshot.staffName,
        department: snapshot.department || allocation.department,
        unit: snapshot.unit || allocation.unit,
        roster: snapshot.roster || allocation.roster,
        status: 'amended',
        updatedBy: auditUserId
      }
    });
    return;
  }

  if (amendment.amendmentType === 'shift_swap' && amendment.swapStaffId) {
    const primary = await findPublishedAllocation(
      amendment.staffId,
      dutyDate,
      amendment.originalShiftTypeId
    );
    const secondary = await findPublishedAllocation(
      amendment.swapStaffId,
      dutyDate,
      amendment.amendedShiftTypeId
    );
    if (!primary || !secondary) {
      throw new Error('Both staff must have published allocations to swap');
    }

    await tx.rosterAllocation.update({
      where: { id: primary.id },
      data: {
        shiftTypeId: secondary.shiftTypeId,
        status: 'amended',
        updatedBy: auditUserId
      }
    });
    await tx.rosterAllocation.update({
      where: { id: secondary.id },
      data: {
        shiftTypeId: primary.shiftTypeId,
        status: 'amended',
        updatedBy: auditUserId
      }
    });
    return;
  }

  const allocation = await findPublishedAllocation(
    amendment.staffId,
    dutyDate,
    amendment.amendmentType === 'extra_duty'
      ? null
      : amendment.originalShiftTypeId
  );

  if (amendment.amendmentType === 'extra_duty' && !allocation) {
    const staff = await prisma.staff.findUnique({
      where: { id: amendment.staffId },
      select: { code: true, name: true, employmentDetails: true }
    });
    if (!staff || !amendment.amendedShiftTypeId) {
      throw new Error('Extra duty requires staff and an amended shift type');
    }

    const shiftType = await prisma.shiftType.findUnique({
      where: { id: amendment.amendedShiftTypeId },
      select: { durationHours: true }
    });
    if (!shiftType) {
      throw new Error('Amended shift type not found');
    }

    const publishedPeriod = await prisma.shiftRoster.findFirst({
      where: {
        status: 'published',
        fromDate: { lte: dutyDate },
        toDate: { gte: dutyDate },
        department: amendment.department
      },
      orderBy: { updatedAt: 'desc' }
    });
    if (!publishedPeriod) {
      throw new Error('No published roster period found for this duty date');
    }

    const employment = (staff.employmentDetails as { employment?: { roster?: string } } | null)
      ?.employment;

    await tx.rosterAllocation.create({
      data: {
        shiftRosterId: publishedPeriod.id,
        staffId: amendment.staffId,
        shiftTypeId: amendment.amendedShiftTypeId,
        date: dutyDate,
        staffCode: staff.code ?? '',
        staffName: staff.name ?? '',
        department: amendment.department,
        unit: publishedPeriod.unit,
        roster: employment?.roster ?? publishedPeriod.roster,
        status: 'amended',
        hours: shiftType.durationHours ?? 0,
        dutyLocation: amendment.dutyLocation,
        createdBy: auditUserId,
        updatedBy: auditUserId
      }
    });
    return;
  }

  if (!allocation) {
    throw new Error('Published allocation not found for this amendment');
  }

  if (amendment.amendmentType === 'location_change') {
    await tx.rosterAllocation.update({
      where: { id: allocation.id },
      data: {
        dutyLocation: amendment.dutyLocation,
        dutyLocationDepartmentId: amendment.dutyLocationDepartmentId,
        dutyZoneId: amendment.dutyZoneId,
        dutyRoomId: amendment.dutyRoomId,
        status: 'amended',
        updatedBy: auditUserId
      }
    });
    return;
  }

  if (!amendment.amendedShiftTypeId) {
    throw new Error('Amended shift type is required');
  }

  const shiftType = await prisma.shiftType.findUnique({
    where: { id: amendment.amendedShiftTypeId },
    select: { durationHours: true }
  });
  if (!shiftType) {
    throw new Error('Amended shift type not found');
  }

  await tx.rosterAllocation.update({
    where: { id: allocation.id },
    data: {
      shiftTypeId: amendment.amendedShiftTypeId,
      hours: shiftType.durationHours ?? allocation.hours,
      status: 'amended',
      updatedBy: auditUserId
    }
  });
}

export async function approveRosterAmendments(
  ids: string[],
  user?: AuditUser,
  remarks?: string | null,
  acknowledgedWarnings?: boolean
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: {
    message?: string;
    softWarnings?: string[];
    requiresAck?: boolean;
  };
}> {
  try {
    const parsed = approveRejectSchema.safeParse({
      ids,
      remarks,
      acknowledgedWarnings
    });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message:
            parsed.error.flatten().fieldErrors.ids?.[0] ??
            'Select at least one amendment'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const amendments = await prisma.rosterAmendment.findMany({
      where: { id: { in: parsed.data.ids } }
    });

    if (amendments.length !== parsed.data.ids.length) {
      return {
        success: false,
        error: { message: 'One or more amendments were not found' }
      };
    }

    for (const amendment of amendments) {
      if (isRosterAmendmentLocked(amendment.status)) {
        return {
          success: false,
          error: {
            message: `${amendment.code} is already ${amendment.status} and cannot be approved again`
          }
        };
      }
    }

    if (!parsed.data.acknowledgedWarnings) {
      const softWarnings: string[] = [];
      for (const amendment of amendments) {
        const softWarnShiftId =
          amendment.amendmentType === 'extra_duty' ||
          amendment.amendmentType === 'shift_change'
            ? amendment.amendedShiftTypeId || amendment.originalShiftTypeId
            : amendment.originalShiftTypeId;
        const softWarnTimes = await resolveShiftTimes(softWarnShiftId);
        const softWarn = await assertAmendmentSoftWarns({
          staffId: amendment.staffId,
          swapStaffId: amendment.swapStaffId,
          dutyDate: amendment.dutyDate,
          acknowledgedWarnings: false,
          amendmentType: amendment.amendmentType,
          startTime: softWarnTimes.startTime,
          endTime: softWarnTimes.endTime
        });
        if (!softWarn.ok) {
          softWarnings.push(
            ...softWarn.softWarnings.map(
              (warning) => `${amendment.code}: ${warning}`
            )
          );
        }
      }
      if (softWarnings.length > 0) {
        return {
          success: false,
          error: {
            message: softWarnings[0],
            softWarnings,
            requiresAck: true
          }
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const amendment of amendments) {
        await applyApprovedAmendment(amendment, auditUser, tx);
        await tx.rosterAmendment.update({
          where: { id: amendment.id },
          data: {
            status: 'approved',
            decidedById: auditUser?.id ?? null,
            decidedAt: new Date(),
            remarks: parsed.data.remarks?.trim() || amendment.remarks,
            updatedBy: auditUser?.id
          }
        });
      }
    });

    return {
      success: true,
      data: { count: amendments.length },
      message: `${amendments.length} amendment(s) approved`
    };
  } catch (error: any) {
    console.error('approveRosterAmendments error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to approve amendments' }
    };
  }
}

export async function rejectRosterAmendments(
  ids: string[],
  user?: AuditUser,
  remarks?: string | null
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const parsed = approveRejectSchema.safeParse({ ids, remarks });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message:
            parsed.error.flatten().fieldErrors.ids?.[0] ??
            'Select at least one amendment'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const amendments = await prisma.rosterAmendment.findMany({
      where: { id: { in: parsed.data.ids } }
    });

    if (amendments.length !== parsed.data.ids.length) {
      return {
        success: false,
        error: { message: 'One or more amendments were not found' }
      };
    }

    for (const amendment of amendments) {
      if (isRosterAmendmentLocked(amendment.status)) {
        return {
          success: false,
          error: {
            message: `${amendment.code} is already ${amendment.status} and cannot be rejected again`
          }
        };
      }
    }

    await prisma.rosterAmendment.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: {
        status: 'rejected',
        decidedById: auditUser?.id ?? null,
        decidedAt: new Date(),
        remarks: parsed.data.remarks?.trim() ?? '',
        updatedBy: auditUser?.id
      }
    });

    return {
      success: true,
      data: { count: amendments.length },
      message: `${amendments.length} amendment(s) rejected`
    };
  } catch (error: any) {
    console.error('rejectRosterAmendments error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to reject amendments' }
    };
  }
}

export async function getRosterAmendmentHistory(
  id: string
): Promise<{
  success: boolean;
  data?: RosterAmendmentHistoryEntry[];
  error?: { message?: string };
}> {
  try {
    const record = await prisma.rosterAmendment.findUnique({ where: { id } });
    if (!record) {
      return { success: false, error: { message: 'Roster amendment not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    const decidedUser = record.decidedById
      ? await authPrisma.user.findUnique({
          where: { id: record.decidedById },
          select: { name: true }
        })
      : null;

    const entries: RosterAmendmentHistoryEntry[] = [
      {
        id: `${record.id}-created`,
        title: 'Created',
        detail: `${record.code} raised for ${record.staffName} (${record.staffCode}).`,
        userLabel: withUsers.createdUser?.name ?? '—',
        at: toIsoString(record.createdAt)
      }
    ];

    if (record.updatedAt.getTime() !== record.createdAt.getTime()) {
      entries.unshift({
        id: `${record.id}-updated`,
        title: 'Updated',
        detail: `${AMENDMENT_TYPE_LABELS[record.amendmentType] ?? record.amendmentType} amendment updated.`,
        userLabel: withUsers.updatedUser?.name ?? '—',
        at: toIsoString(record.updatedAt)
      });
    }

    if (record.status === 'approved' && record.decidedAt) {
      entries.unshift({
        id: `${record.id}-approved`,
        title: 'Approved',
        detail: `Amendment approved and applied to the live roster.`,
        userLabel: decidedUser?.name ?? '—',
        at: toIsoString(record.decidedAt)
      });
    }

    if (record.status === 'rejected' && record.decidedAt) {
      entries.unshift({
        id: `${record.id}-rejected`,
        title: 'Rejected',
        detail: record.remarks || 'Amendment rejected. Original roster unchanged.',
        userLabel: decidedUser?.name ?? '—',
        at: toIsoString(record.decidedAt)
      });
    }

    return { success: true, data: entries };
  } catch (error: any) {
    console.error('getRosterAmendmentHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load amendment history' }
    };
  }
}

export async function getRosterAmendmentsForExport(
  params: GetRosterAmendmentsParams
): Promise<{
  data: Record<string, unknown>[];
  totalRecords: number;
}> {
  try {
    const where = buildAmendmentWhere(params);
    const records = await prisma.rosterAmendment.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    const withUsers = await resolveAuthUsers(records);
    const data = withUsers.map((record) => {
      const row = mapAmendmentRecord(record, {
        createdUser: record.createdUser,
        updatedUser: record.updatedUser
      });
      return {
        amendmentNo: row.code,
        staffCode: row.staffCode,
        staffName: row.staffName,
        rosterDate: row.dutyDate.slice(0, 10),
        originalShift: row.originalShiftLabel,
        amendedShift: row.amendedShiftLabel || '—',
        amendmentType:
          AMENDMENT_TYPE_LABELS[row.amendmentType] ?? row.amendmentType,
        reason: row.reason,
        requestedBy: row.requestedByName || '—',
        status: row.status,
        updatedBy: row.updatedUser?.name ?? row.updatedBy ?? '—',
        updatedAt: row.updatedAt,
        createdBy: row.createdUser?.name ?? row.createdBy ?? '—',
        createdAt: row.createdAt
      };
    });

    return {
      data,
      totalRecords: data.length
    };
  } catch (error) {
    console.error('getRosterAmendmentsForExport error:', error);
    throw new Error('Error getting data');
  }
}
