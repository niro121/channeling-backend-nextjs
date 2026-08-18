'use server';

import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { saveRosterAllocationDraft } from '@/services/roster-services/shift-roster.service';
import type {
  DutyAttendance,
  DutyRosterFilterOptions,
  DutyRosterFormOptions,
  DutyRosterHistoryEntry,
  DutyRosterRow,
  DutyRosterStaffOption,
  DutyRosterSummary,
  GetDutyRosterParams,
  ReplaceDutyPayload,
  RosterAllocationStatus,
  RosterFilterOption,
  SaveRosterAllocationDraftPayload,
  SwapDutyPayload,
  UpdateDutyAttendancePayload
} from '@/types/roster';
import { parseDutyView, dutyRangeBounds } from '@/lib/utils/duty-roster-view';
import { DUTY_ATTENDANCE_VALUES } from '@/types/roster';

const PUBLISHED_LOCK_MESSAGE =
  'This date is already published. Use a roster amendment before changing it.';

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isoDate(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function startOfDay(dateStr: string): Date {
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

function todayIso(): string {
  return isoDate(new Date());
}

function publishedLockError() {
  return {
    success: false as const,
    error: {
      message: PUBLISHED_LOCK_MESSAGE,
      issues: {
        dutyDate: ['Published roster dates cannot be changed directly']
      }
    }
  };
}

type AllocationWithShift = {
  id: string;
  staffId: string;
  shiftTypeId: string;
  date: Date;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  roster: string;
  status: string;
  isLeave: boolean;
  dutyLocation: string;
  supervisorId: string | null;
  supervisorName: string;
  attendance: string | null;
  comments: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  shiftType: {
    name: string;
    code: string;
    chipLabel: string | null;
    startTime: string;
    endTime: string;
  };
};

function mapDutyRow(record: AllocationWithShift): DutyRosterRow {
  return {
    id: record.id,
    staffId: record.staffId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    shiftTypeId: record.shiftTypeId,
    shiftName: record.shiftType.chipLabel || record.shiftType.name,
    startTime: record.shiftType.startTime,
    endTime: record.shiftType.endTime,
    dutyLocation: record.dutyLocation,
    wardUnit: record.unit,
    department: record.department,
    roster: record.roster,
    supervisorId: record.supervisorId,
    supervisorName: record.supervisorName,
    status: record.status as RosterAllocationStatus,
    attendance: (record.attendance as DutyAttendance | null) ?? null,
    comments: record.comments,
    isLeave: record.isLeave,
    date: toIsoString(record.date),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy
  };
}

async function assertWritableAllocation(allocation: {
  id: string;
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
  const employment = staff.employmentDetails?.employment;
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

const swapSchema = z.object({
  allocationId: z.string().optional(),
  staffId: z.string().min(1, 'Staff member is required'),
  otherStaffId: z.string().min(1, 'Swap with staff is required'),
  dutyDate: z.coerce.date()
});

const replaceSchema = z.object({
  allocationId: z.string().optional(),
  staffId: z.string().min(1, 'Staff member is required'),
  replacementStaffId: z.string().min(1, 'Replacement staff is required'),
  dutyDate: z.coerce.date()
});

const attendanceSchema = z.object({
  allocationId: z.string().min(1, 'Allocation is required'),
  attendance: z.enum(DUTY_ATTENDANCE_VALUES).nullable()
});

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
  isLeave: true,
  dutyLocation: true,
  supervisorId: true,
  supervisorName: true,
  attendance: true,
  comments: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  shiftType: {
    select: {
      name: true,
      code: true,
      chipLabel: true,
      startTime: true,
      endTime: true
    }
  }
} as const;

function dutyWhere(
  params: GetDutyRosterParams,
  fromUtc: Date,
  toUtc: Date
): Prisma.RosterAllocationWhereInput {
  const where: Prisma.RosterAllocationWhereInput = {
    date:
      fromUtc.getTime() === toUtc.getTime()
        ? fromUtc
        : { gte: fromUtc, lte: toUtc }
  };
  if (params.department) where.department = params.department;
  if (params.unit) where.unit = params.unit;
  if (params.roster) where.roster = params.roster;
  if (params.shiftTypeId) where.shiftTypeId = params.shiftTypeId;
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { staffCode: { contains: q, mode: 'insensitive' } },
      { staffName: { contains: q, mode: 'insensitive' } }
    ];
  }
  return where;
}

function resolveDutyUtcRange(params: GetDutyRosterParams): {
  fromUtc: Date;
  toUtc: Date;
} {
  const dutyDate = params.dutyDate || todayIso();
  const view = parseDutyView(params.view);
  const { from, to } = dutyRangeBounds(parseISO(dutyDate.slice(0, 10)), view);
  return {
    fromUtc: startOfDay(format(from, 'yyyy-MM-dd')),
    toUtc: startOfDay(format(to, 'yyyy-MM-dd'))
  };
}

export async function getDutyRoster(params: GetDutyRosterParams): Promise<{
  success: boolean;
  data?: {
    records: DutyRosterRow[];
    totalRecords: number;
    summary: DutyRosterSummary;
  };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const { fromUtc, toUtc } = resolveDutyUtcRange(params);
    const view = parseDutyView(params.view);
    const unpaged = view !== 'daily';
    const pageNumber =
      Number.parseInt(params.page ?? process.env.DEFAULT_PAGE ?? '0', 10) || 1;
    const defaultLimit =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      Number.parseInt(params.limit ?? String(defaultLimit), 10) || defaultLimit,
      200
    );
    const skip = (pageNumber - 1) * pageSize;
    const where = dutyWhere(params, fromUtc, toUtc);

    const assignmentWhere: Prisma.StaffShiftAssignmentWhereInput = {
      status: 'active',
      effectiveFrom: { lte: toUtc },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: fromUtc } }]
    };
    if (params.department) assignmentWhere.department = params.department;
    if (params.unit) assignmentWhere.unit = params.unit;

    const [totalRecords, records, assignedStaff, allocatedStaff] =
      await Promise.all([
        prisma.rosterAllocation.count({ where }),
        prisma.rosterAllocation.findMany({
          where,
          select: allocationSelect,
          orderBy: [{ date: 'asc' }, { staffCode: 'asc' }],
          ...(unpaged ? { take: 2000 } : { skip, take: pageSize })
        }),
        prisma.staffShiftAssignment.findMany({
          where: assignmentWhere,
          select: { staffId: true },
          distinct: ['staffId']
        }),
        prisma.rosterAllocation.findMany({
          where,
          select: { staffId: true },
          distinct: ['staffId']
        })
      ]);

    const withUsers = await resolveAuthUsers(records.map(mapDutyRow));

    const attendanceCounts = await prisma.rosterAllocation.groupBy({
      by: ['attendance'],
      where,
      _count: { _all: true }
    });

    let present = 0;
    let lateArrivals = 0;
    for (const row of attendanceCounts) {
      if (row.attendance === 'present') present = row._count._all;
      if (row.attendance === 'late') lateArrivals = row._count._all;
    }

    const allocatedSet = new Set(allocatedStaff.map((row) => row.staffId));
    const summary: DutyRosterSummary = {
      onDutyToday: totalRecords,
      present,
      lateArrivals,
      unfilledDuties: assignedStaff.filter(
        (row) => !allocatedSet.has(row.staffId)
      ).length
    };

    return {
      success: true,
      data: { records: withUsers, totalRecords, summary },
      message: 'Duty roster loaded'
    };
  } catch (error: any) {
    console.error('getDutyRoster error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load duty roster' }
    };
  }
}

export async function getDutyRosterForExport(params: GetDutyRosterParams): Promise<{
  success: boolean;
  data?: DutyRosterRow[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const { fromUtc, toUtc } = resolveDutyUtcRange(params);
    const records = await prisma.rosterAllocation.findMany({
      where: dutyWhere(params, fromUtc, toUtc),
      select: allocationSelect,
      orderBy: [{ date: 'asc' }, { staffCode: 'asc' }]
    });
    const withUsers = await resolveAuthUsers(records.map(mapDutyRow));
    return {
      success: true,
      data: withUsers,
      message: 'Duty roster export fetched'
    };
  } catch (error: any) {
    console.error('getDutyRosterForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export duty roster' }
    };
  }
}

export async function getDutyRosterFilterOptions(): Promise<{
  success: boolean;
  data?: DutyRosterFilterOptions;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const [allocations, assignments, shiftTypes] = await Promise.all([
      prisma.rosterAllocation.findMany({
        select: { department: true, unit: true, roster: true },
        distinct: ['department', 'unit', 'roster']
      }),
      prisma.staffShiftAssignment.findMany({
        select: { department: true, unit: true },
        distinct: ['department', 'unit']
      }),
      prisma.shiftType.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true }
      })
    ]);

    const staff = await prisma.staff.findMany({
      where: { status: 1 },
      select: { employmentDetails: true }
    });

    return {
      success: true,
      data: {
        departments: uniqueStrings([
          ...allocations.map((row) => row.department),
          ...assignments.map((row) => row.department),
          ...staff.map((row) => row.employmentDetails?.employment?.department)
        ]).map(toOption),
        units: uniqueStrings([
          ...allocations.map((row) => row.unit),
          ...assignments.map((row) => row.unit)
        ]).map(toOption),
        rosters: uniqueStrings([
          ...allocations.map((row) => row.roster),
          ...staff.map((row) => row.employmentDetails?.employment?.roster)
        ]).map(toOption),
        shifts: shiftTypes.map((shift) => ({
          id: shift.id,
          name: shift.code ? `${shift.code} — ${shift.name}` : shift.name
        }))
      },
      message: 'Duty roster filters fetched'
    };
  } catch (error: any) {
    console.error('getDutyRosterFilterOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load duty roster filters' }
    };
  }
}

export async function getDutyRosterFormOptions(): Promise<{
  success: boolean;
  data?: DutyRosterFormOptions;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const [staffRecords, shiftTypes, allocationSnaps, assignmentSnaps] =
      await Promise.all([
        prisma.staff.findMany({
          where: { status: 1 },
          orderBy: { name: 'asc' },
          take:
            Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100,
          select: {
            id: true,
            name: true,
            code: true,
            shiftAssignments: {
              where: { status: 'active' },
              select: { unit: true, department: true },
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
            code: true,
            startTime: true,
            endTime: true
          }
        }),
        prisma.rosterAllocation.findMany({
          select: { dutyLocation: true, unit: true },
          distinct: ['dutyLocation', 'unit']
        }),
        prisma.staffShiftAssignment.findMany({
          select: { unit: true },
          distinct: ['unit']
        })
      ]);

    const staff: DutyRosterStaffOption[] = staffRecords.map((record) => ({
      id: record.id,
      name: record.code
        ? `${record.code} — ${record.name}`
        : (record.name ?? ''),
      staffCode: record.code ?? '',
      dutyLocation: '',
      wardUnit: record.shiftAssignments[0]?.unit?.trim() || ''
    }));

    const units = uniqueStrings([
      ...allocationSnaps.map((row) => row.unit),
      ...assignmentSnaps.map((row) => row.unit)
    ]).map(toOption);
    const locations = uniqueStrings([
      ...allocationSnaps.map((row) => row.dutyLocation),
      ...units.map((row) => row.name)
    ]).map(toOption);

    return {
      success: true,
      data: {
        staff,
        shiftTypes: shiftTypes.map((shift) => ({
          id: shift.id,
          name: shift.code ? `${shift.code} — ${shift.name}` : shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime
        })),
        supervisors: staff.map((record) => ({
          id: record.id,
          name: record.name
        })),
        locations,
        units
      },
      message: 'Duty roster form options fetched'
    };
  } catch (error: any) {
    console.error('getDutyRosterFormOptions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load duty roster form options'
      }
    };
  }
}

export async function saveDutyAllocation(
  payload: SaveRosterAllocationDraftPayload,
  user?: AuditUser
) {
  if (payload.allocationId) {
    const existing = await prisma.rosterAllocation.findUnique({
      where: { id: payload.allocationId },
      select: {
        id: true,
        status: true,
        date: true,
        department: true,
        unit: true,
        roster: true,
        shiftRosterId: true
      }
    });
    if (!existing) {
      return { success: false, error: { message: 'Duty allocation not found' } };
    }
    const lock = await assertWritableAllocation(existing);
    if (!lock.ok) {
      return publishedLockError();
    }
  }

  if (payload.staffId && !payload.department) {
    const snapshot = await getStaffSnapshot(payload.staffId);
    if (snapshot) {
      payload = {
        ...payload,
        department: payload.department ?? snapshot.department,
        unit: payload.unit ?? snapshot.unit,
        roster: payload.roster ?? snapshot.roster
      };
    }
  }

  return saveRosterAllocationDraft(payload, user);
}

export async function swapDutyAllocations(
  payload: SwapDutyPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = swapSchema.safeParse(payload);
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
    if (data.staffId === data.otherStaffId) {
      return {
        success: false,
        error: {
          message: 'Select a different registered staff member',
          issues: { otherStaffId: ['Must be different from the first staff member'] }
        }
      };
    }

    const dutyUtc = new Date(
      Date.UTC(
        data.dutyDate.getFullYear(),
        data.dutyDate.getMonth(),
        data.dutyDate.getDate()
      )
    );

    const [left, right] = await Promise.all([
      data.allocationId
        ? prisma.rosterAllocation.findUnique({
            where: { id: data.allocationId },
            select: {
              id: true,
              staffId: true,
              shiftTypeId: true,
              hours: true,
              status: true,
              date: true,
              department: true,
              unit: true,
              roster: true,
              shiftRosterId: true
            }
          })
        : prisma.rosterAllocation.findFirst({
            where: { staffId: data.staffId, date: dutyUtc },
            select: {
              id: true,
              staffId: true,
              shiftTypeId: true,
              hours: true,
              status: true,
              date: true,
              department: true,
              unit: true,
              roster: true,
              shiftRosterId: true
            }
          }),
      prisma.rosterAllocation.findFirst({
        where: { staffId: data.otherStaffId, date: dutyUtc },
        select: {
          id: true,
          staffId: true,
          shiftTypeId: true,
          hours: true,
          status: true,
          date: true,
          department: true,
          unit: true,
          roster: true,
          shiftRosterId: true
        }
      })
    ]);

    if (!left) {
      return {
        success: false,
        error: { message: 'The selected staff member has no duty on this date' }
      };
    }
    if (!right) {
      return {
        success: false,
        error: {
          message:
            'Swap requires both staff members to already have a duty on this date. Use Replace to assign the duty to another staff member.'
        }
      };
    }

    const [leftLock, rightLock] = await Promise.all([
      assertWritableAllocation(left),
      assertWritableAllocation(right)
    ]);
    if (!leftLock.ok || !rightLock.ok) {
      return publishedLockError();
    }

    const auditUser = toAuditUser(user);
    await prisma.$transaction([
      prisma.rosterAllocation.update({
        where: { id: left.id },
        data: {
          shiftTypeId: right.shiftTypeId,
          hours: right.hours,
          updatedBy: auditUser?.id
        }
      }),
      prisma.rosterAllocation.update({
        where: { id: right.id },
        data: {
          shiftTypeId: left.shiftTypeId,
          hours: left.hours,
          updatedBy: auditUser?.id
        }
      })
    ]);

    return { success: true, message: 'Duty shifts swapped' };
  } catch (error: any) {
    console.error('swapDutyAllocations error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to swap duty shifts' }
    };
  }
}

export async function replaceDutyStaff(
  payload: ReplaceDutyPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = replaceSchema.safeParse(payload);
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
    if (data.staffId === data.replacementStaffId) {
      return {
        success: false,
        error: {
          message: 'Select a different registered staff member',
          issues: {
            replacementStaffId: ['Must be different from the staff being replaced']
          }
        }
      };
    }

    const dutyUtc = new Date(
      Date.UTC(
        data.dutyDate.getFullYear(),
        data.dutyDate.getMonth(),
        data.dutyDate.getDate()
      )
    );

    const allocation = data.allocationId
      ? await prisma.rosterAllocation.findUnique({
          where: { id: data.allocationId },
          select: {
            id: true,
            staffId: true,
            status: true,
            date: true,
            department: true,
            unit: true,
            roster: true,
            shiftRosterId: true
          }
        })
      : await prisma.rosterAllocation.findFirst({
          where: { staffId: data.staffId, date: dutyUtc },
          select: {
            id: true,
            staffId: true,
            status: true,
            date: true,
            department: true,
            unit: true,
            roster: true,
            shiftRosterId: true
          }
        });

    if (!allocation) {
      return {
        success: false,
        error: { message: 'The selected staff member has no duty on this date' }
      };
    }

    const lock = await assertWritableAllocation(allocation);
    if (!lock.ok) {
      return publishedLockError();
    }

    const occupied = await prisma.rosterAllocation.findFirst({
      where: {
        staffId: data.replacementStaffId,
        date: allocation.date,
        id: { not: allocation.id }
      },
      select: { id: true }
    });
    if (occupied) {
      return {
        success: false,
        error: {
          message:
            'Replacement staff already has a roster allocation on this date'
        }
      };
    }

    const snapshot = await getStaffSnapshot(data.replacementStaffId);
    if (!snapshot) {
      return { success: false, error: { message: 'Replacement staff not found' } };
    }

    const auditUser = toAuditUser(user);
    await prisma.rosterAllocation.update({
      where: { id: allocation.id },
      data: {
        staffId: data.replacementStaffId,
        staffCode: snapshot.staffCode,
        staffName: snapshot.staffName,
        department: snapshot.department || allocation.department,
        unit: snapshot.unit || allocation.unit,
        roster: snapshot.roster || allocation.roster,
        updatedBy: auditUser?.id
      }
    });

    return { success: true, message: 'Duty staff replaced' };
  } catch (error: any) {
    console.error('replaceDutyStaff error:', error);
    if (error?.code === 'P2002') {
      return {
        success: false,
        error: {
          message:
            'Replacement staff already has a roster allocation on this date'
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to replace duty staff' }
    };
  }
}

export async function updateDutyAttendance(
  payload: UpdateDutyAttendancePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = attendanceSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const allocation = await prisma.rosterAllocation.findUnique({
      where: { id: parsed.data.allocationId },
      select: {
        id: true,
        status: true,
        date: true,
        department: true,
        unit: true,
        roster: true,
        shiftRosterId: true
      }
    });
    if (!allocation) {
      return { success: false, error: { message: 'Duty allocation not found' } };
    }

    const lock = await assertWritableAllocation(allocation);
    if (!lock.ok) {
      return publishedLockError();
    }

    const auditUser = toAuditUser(user);
    await prisma.rosterAllocation.update({
      where: { id: allocation.id },
      data: {
        attendance: parsed.data.attendance,
        updatedBy: auditUser?.id
      }
    });

    return { success: true, message: 'Attendance updated' };
  } catch (error: any) {
    console.error('updateDutyAttendance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update attendance' }
    };
  }
}

export async function deleteDutyAllocation(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid allocation ID' } };
    }

    const allocation = await prisma.rosterAllocation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        date: true,
        department: true,
        unit: true,
        roster: true,
        shiftRosterId: true
      }
    });
    if (!allocation) {
      return { success: false, error: { message: 'Duty allocation not found' } };
    }

    const lock = await assertWritableAllocation(allocation);
    if (!lock.ok) {
      return { success: false, error: { message: PUBLISHED_LOCK_MESSAGE } };
    }

    void user;
    await prisma.rosterAllocation.delete({ where: { id } });
    return { success: true, message: 'Duty allocation deleted' };
  } catch (error: any) {
    console.error('deleteDutyAllocation error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete duty allocation' }
    };
  }
}

const HISTORY_TITLES: Record<string, string> = {
  'duty.roster.assigned': 'Duty assigned',
  'duty.roster.updated': 'Duty updated',
  'duty.roster.swapped': 'Duty shifts swapped',
  'duty.roster.replaced': 'Duty staff replaced',
  'duty.roster.attendanceUpdated': 'Attendance updated',
  'duty.roster.deleted': 'Duty allocation deleted'
};

export async function getDutyRosterHistory(id: string): Promise<{
  success: boolean;
  data?: DutyRosterHistoryEntry[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid allocation ID' } };
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

    return {
      success: true,
      data: withUsers.map((log) => {
        const metadata = (log.metadata ?? {}) as {
          staffName?: string;
          staffCode?: string;
        };
        const label = metadata.staffName || 'Duty allocation';
        const code = metadata.staffCode ? ` (${metadata.staffCode})` : '';
        return {
          id: log.id,
          title: HISTORY_TITLES[log.action] ?? 'Duty roster change',
          detail: `${label}${code}.`,
          userLabel: log.createdUser?.name ?? '—',
          at: toIsoString(log.createdAt)
        };
      }),
      message: 'Duty roster history fetched'
    };
  } catch (error: any) {
    console.error('getDutyRosterHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch duty roster history' }
    };
  }
}
