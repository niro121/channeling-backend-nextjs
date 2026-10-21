'use server';

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  subMonths
} from 'date-fns';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import type {
  LoadRosterParams,
  LoadRosterResult,
  ShiftRosterPeriodAudit,
  RosterAllocationStatus,
  RosterFilterOption,
  RosterFilterOptions,
  RosterGridSummary,
  RosterStaffRow,
  SaveRosterAllocationDraftPayload,
  ShiftCell,
  ShiftTypeChip,
  ToggleRosterAllocationLeavePayload
} from '@/types/roster';
import {
  DUTY_ATTENDANCE_VALUES,
  SHIFT_ROSTER_CODE_PREFIX
} from '@/types/roster';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toOption(value: string): RosterFilterOption {
  return { id: value, name: value };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function startOfDay(dateStr: string): Date {
  const d = parseISO(dateStr);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function buildWeekMeta(fromDate: string, toDate: string) {
  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  const days = eachDayOfInterval({ start: from, end: to });
  const dayIsos = days.map(iso);
  return {
    dayIsos,
    weekLabel: `Week of ${format(from, 'dd MMM yyyy')} - ${format(to, 'dd MMM yyyy')}`,
    weekRangeShort: `${format(from, 'dd')}-${format(to, 'dd MMM')}`
  };
}

function currentWeekRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  return {
    fromDate: iso(weekStart),
    toDate: iso(addDays(weekStart, 6))
  };
}

async function loadPeriodAudit(input: {
  department: string;
  unit: string;
  roster: string;
  fromDate: Date;
  toDate: Date;
}): Promise<ShiftRosterPeriodAudit | null> {
  const period = await prisma.shiftRoster.findFirst({
    where: {
      department: input.department,
      unit: input.unit,
      roster: input.roster,
      fromDate: input.fromDate,
      toDate: input.toDate
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
      status: true,
      publishedAt: true
    }
  });

  if (!period) return null;

  const [withUsers] = await resolveAuthUsers([period]);

  return {
    createdByLabel: withUsers.createdUser?.name ?? '—',
    createdAt: period.createdAt.toISOString(),
    updatedByLabel: withUsers.updatedUser?.name ?? '—',
    updatedAt: period.updatedAt.toISOString(),
    publishedLabel:
      period.status === 'published' && period.publishedAt
        ? `Published ${format(period.publishedAt, 'dd MMM yyyy')}`
        : null
  };
}

const saveDraftSchema = z.object({
  allocationId: z.string().optional(),
  staffId: z.string().min(1, 'Staff member is required'),
  shiftTypeId: z.string().min(1, 'Shift type is required'),
  rosterDate: z.coerce.date(),
  periodFromDate: z.coerce.date(),
  periodToDate: z.coerce.date(),
  department: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  roster: z.string().optional().nullable(),
  isLeave: z.boolean().optional().default(false),
  otHours: z.coerce.number().min(0, 'OT hours must be 0 or greater').optional().default(0),
  comments: z.string().max(500).optional().nullable(),
  dutyLocation: z.string().optional().nullable(),
  supervisorId: z.string().optional().nullable(),
  attendance: z.enum(DUTY_ATTENDANCE_VALUES).optional().nullable()
});

const toggleLeaveSchema = z.object({
  allocationId: z.string().min(1, 'Allocation is required'),
  isLeave: z.boolean()
});

const workflowRangeSchema = z.object({
  department: z.string().optional(),
  unit: z.string().optional(),
  roster: z.string().optional(),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required')
});

function normalizeRangeInput(input: z.infer<typeof workflowRangeSchema>) {
  const fromDate = startOfDay(input.fromDate);
  const toDate = startOfDay(input.toDate);
  if (toDate < fromDate) {
    throw new Error('To date must be on or after From date');
  }
  return {
    department: input.department?.trim() ?? '',
    unit: input.unit?.trim() ?? '',
    roster: input.roster?.trim() ?? '',
    fromDate,
    toDate
  };
}

async function getScopedStaffForRange(input: {
  department: string;
  unit: string;
  roster: string;
  fromDate: Date;
  toDate: Date;
}) {
  const staff = await prisma.staff.findMany({
    where: { status: 1 },
    select: {
      id: true,
      employmentDetails: true,
      shiftAssignments: {
        where: {
          status: 'active',
          effectiveFrom: { lte: input.toDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.fromDate } }]
        },
        select: {
          department: true,
          unit: true,
          designation: true
        }
      }
    }
  });

  return staff.filter((record) => {
    const assignment = record.shiftAssignments[0];
    if (!assignment) return false;
    if (input.department && assignment.department !== input.department) return false;
    if (input.unit && assignment.unit !== input.unit) return false;
    const employment = (record.employmentDetails as { employment?: { roster?: string | null } } | null)?.employment;
    if (input.roster && (employment?.roster ?? '') !== input.roster) return false;
    return true;
  });
}

async function ensureDraftShiftRoster(input: {
  department: string;
  unit: string;
  roster: string;
  fromDate: Date;
  toDate: Date;
  user?: AuditUser;
}) {
  const existing = await prisma.shiftRoster.findFirst({
    where: {
      department: input.department,
      unit: input.unit,
      roster: input.roster,
      fromDate: input.fromDate,
      toDate: input.toDate,
      status: 'draft'
    },
    select: { id: true }
  });

  if (existing) return existing.id;

  const generated = await generateRecordCode(SHIFT_ROSTER_CODE_PREFIX);
  if (!generated.success) {
    throw new Error('Failed to generate roster code. Please try again.');
  }

  const auditUser = toAuditUser(input.user);
  const rangeLabel = `${format(input.fromDate, 'dd MMM yyyy')} - ${format(input.toDate, 'dd MMM yyyy')}`;

  const created = await prisma.shiftRoster.create({
    data: {
      code: generated.code,
      name: input.roster
        ? `${input.roster} (${rangeLabel})`
        : `Shift Roster (${rangeLabel})`,
      department: input.department,
      unit: input.unit,
      roster: input.roster,
      fromDate: input.fromDate,
      toDate: input.toDate,
      status: 'draft',
      createdBy: auditUser?.id,
      updatedBy: auditUser?.id
    },
    select: { id: true }
  });

  return created.id;
}

/* ------------------------------------------------------------------ */
/*  Load roster (D4 read)                                              */
/* ------------------------------------------------------------------ */

export async function loadRoster(
  params: LoadRosterParams
): Promise<{
  success: boolean;
  data?: LoadRosterResult;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const defaults = currentWeekRange();
    const fromDate = params.fromDate || defaults.fromDate;
    const toDate = params.toDate || defaults.toDate;
    const pageSize = Math.min(
      Number.parseInt(params.limit || '20', 10) || 20,
      100
    );
    const pageNum = Math.max(Number.parseInt(params.page || '1', 10), 1);
    const skip = (pageNum - 1) * pageSize;

    const fromUtc = startOfDay(fromDate);
    const toUtc = startOfDay(toDate);

    // 1. Get active staff with active shift assignments
    const assignmentWhere: Record<string, unknown> = {
      status: 'active',
      effectiveFrom: { lte: toUtc },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: fromUtc } }
      ]
    };

    // Build staff where clause
    const staffWhere: Record<string, unknown> = { status: 1 };

    // Resolve staff filters via employment details
    if (params.search) {
      const q = params.search.trim();
      staffWhere.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } }
      ];
    }

    // 2. Query staff with their active assignments
    const [allStaff, shiftTypes] = await Promise.all([
      prisma.staff.findMany({
        where: staffWhere,
        select: {
          id: true,
          code: true,
          name: true,
          employmentDetails: true,
          shiftAssignments: {
            where: assignmentWhere,
            select: {
              department: true,
              unit: true,
              designation: true
            },
            take: 1
          }
        },
        orderBy: { code: 'asc' }
      }),
      prisma.shiftType.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          startTime: true,
          endTime: true,
          durationHours: true
        }
      })
    ]);

    // Filter: only staff with active shift assignments
    let staffWithAssignments = allStaff.filter(
      (s) => s.shiftAssignments.length > 0
    );

    // Apply department / unit / roster filters on assignment snapshot
    if (params.department) {
      staffWithAssignments = staffWithAssignments.filter((s) => {
        const dept = s.shiftAssignments[0]?.department;
        return dept === params.department;
      });
    }
    if (params.unit) {
      staffWithAssignments = staffWithAssignments.filter((s) => {
        const unit = s.shiftAssignments[0]?.unit;
        return unit === params.unit;
      });
    }

    // Also filter by employment-level roster if requested
    if (params.roster) {
      staffWithAssignments = staffWithAssignments.filter((s) => {
        const employment = (s.employmentDetails as any)?.employment;
        return employment?.roster === params.roster;
      });
    }

    const totalRecords = staffWithAssignments.length;
    const pagedStaff = staffWithAssignments.slice(skip, skip + pageSize);
    const staffIds = pagedStaff.map((s) => s.id);

    // 3. Load allocations for these staff in date range
    const allocations = staffIds.length
      ? await prisma.rosterAllocation.findMany({
          where: {
            staffId: { in: staffIds },
            date: { gte: fromUtc, lte: toUtc }
          },
          select: {
            id: true,
            staffId: true,
            shiftTypeId: true,
            date: true,
            isLeave: true,
            hours: true,
            otHours: true,
            status: true,
            comments: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            updatedBy: true
          },
          orderBy: { date: 'asc' }
        })
      : [];

    const allocationsWithUsers = await resolveAuthUsers(allocations);
    const allocationById = new Map(
      allocationsWithUsers.map((alloc) => [alloc.id, alloc])
    );

    // Build shift type lookup
    const shiftTypeMap = new Map(
      shiftTypes.map((st) => [
        st.id,
        {
          id: st.id,
          code: st.code,
          name: st.name,
          timeRange:
            st.startTime && st.endTime
              ? `${st.startTime}-${st.endTime}`
              : '—',
          durationHours: st.durationHours ?? 0
        }
      ])
    );

    // 4. Build grid rows
    const weekMeta = buildWeekMeta(fromDate, toDate);
    const emptyShifts = Object.fromEntries(
      weekMeta.dayIsos.map((d) => [d, null])
    ) as Record<string, ShiftCell | null>;

    let totalShifts = 0;
    let totalHoursSum = 0;
    let conflictCount = 0;
    const departmentSet = new Set<string>();

    const rows: RosterStaffRow[] = pagedStaff.map((staff) => {
      const assignment = staff.shiftAssignments[0];
      const dept = assignment?.department ?? '';
      const unit = assignment?.unit ?? '';
      const designation = assignment?.designation ?? '';

      if (dept) departmentSet.add(dept);

      const staffAllocations = allocations.filter(
        (a) => a.staffId === staff.id
      );

      const shifts = { ...emptyShifts };
      let rowTotalHours = 0;
      let rowOtHours = 0;
      let rowStatus: RosterStaffRow['status'] = 'none';
      const dateAllocCounts = new Map<string, number>();

      for (const alloc of staffAllocations) {
        const dateKey = iso(alloc.date);
        dateAllocCounts.set(dateKey, (dateAllocCounts.get(dateKey) ?? 0) + 1);

        if (shifts[dateKey] !== undefined) {
          const st = shiftTypeMap.get(alloc.shiftTypeId);
          const allocAudit = allocationById.get(alloc.id);
          shifts[dateKey] = {
            allocationId: alloc.id,
            shiftTypeId: alloc.shiftTypeId,
            code: st?.code ?? '?',
            label: st?.name ?? 'Unknown',
            timeRange: st?.timeRange ?? '—',
            isLeave: alloc.isLeave,
            hours: alloc.hours,
            otHours: alloc.otHours,
            status: alloc.status as RosterAllocationStatus,
            comments: alloc.comments ?? '',
            createdAt: alloc.createdAt.toISOString(),
            updatedAt: alloc.updatedAt.toISOString(),
            createdUser: allocAudit?.createdUser ?? null,
            updatedUser: allocAudit?.updatedUser ?? null
          };
          totalShifts++;
          rowTotalHours += alloc.hours;
          rowOtHours += alloc.otHours;

          if (alloc.status === 'published') rowStatus = 'published';
          else if (alloc.status === 'amended' && rowStatus !== 'published')
            rowStatus = 'amended';
          else if (
            alloc.status === 'draft' &&
            rowStatus !== 'published' &&
            rowStatus !== 'amended'
          )
            rowStatus = 'draft';
        }
      }

      for (const count of dateAllocCounts.values()) {
        if (count > 1) conflictCount++;
      }

      totalHoursSum += rowTotalHours;

      return {
        staffId: staff.id,
        staffCode: staff.code ?? '',
        staffName: staff.name ?? '',
        department: dept,
        unit,
        designation,
        shifts,
        totalHours: rowTotalHours,
        otHours: rowOtHours,
        status: rowStatus
      };
    });

    // 5. Build filter options from all staff with assignments
    const allDepts: string[] = [];
    const allUnits: string[] = [];
    const allRosters: string[] = [];

    for (const staff of allStaff) {
      if (staff.shiftAssignments.length === 0) continue;
      const a = staff.shiftAssignments[0];
      if (a.department) allDepts.push(a.department);
      if (a.unit) allUnits.push(a.unit);
      const employment = (staff.employmentDetails as any)?.employment;
      if (employment?.roster) allRosters.push(employment.roster);
    }

    const filterOptions: RosterFilterOptions = {
      departments: uniqueStrings(allDepts).map(toOption),
      units: uniqueStrings(allUnits).map(toOption),
      rosters: uniqueStrings(allRosters).map(toOption)
    };

    const summary: RosterGridSummary = {
      staffRostered: totalRecords,
      departments: departmentSet.size,
      shiftsThisWeek: totalShifts,
      totalHours: totalHoursSum,
      conflicts: conflictCount
    };

    const shiftTypeChips: ShiftTypeChip[] = [...shiftTypeMap.values()];
    const periodAudit = await loadPeriodAudit({
      department: params.department?.trim() ?? '',
      unit: params.unit?.trim() ?? '',
      roster: params.roster?.trim() ?? '',
      fromDate: fromUtc,
      toDate: toUtc
    });

    return {
      success: true,
      data: {
        rows,
        totalRecords,
        summary,
        filterOptions,
        shiftTypes: shiftTypeChips,
        periodAudit,
        ...weekMeta
      },
      message: 'Roster loaded'
    };
  } catch (error: any) {
    console.error('loadRoster error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load roster'
      }
    };
  }
}

export async function saveRosterAllocationDraft(
  payload: SaveRosterAllocationDraftPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { id: string; shiftRosterId: string };
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = saveDraftSchema.safeParse(payload);
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
    const rosterDate = new Date(
      Date.UTC(
        data.rosterDate.getFullYear(),
        data.rosterDate.getMonth(),
        data.rosterDate.getDate()
      )
    );
    const periodFromDate = new Date(
      Date.UTC(
        data.periodFromDate.getFullYear(),
        data.periodFromDate.getMonth(),
        data.periodFromDate.getDate()
      )
    );
    const periodToDate = new Date(
      Date.UTC(
        data.periodToDate.getFullYear(),
        data.periodToDate.getMonth(),
        data.periodToDate.getDate()
      )
    );

    if (periodToDate < periodFromDate) {
      return {
        success: false,
        error: {
          message: 'Period end date must be on or after start date',
          issues: { periodToDate: ['Must be on or after the start date'] }
        }
      };
    }
    if (rosterDate < periodFromDate || rosterDate > periodToDate) {
      return {
        success: false,
        error: {
          message: 'Roster date must be within the selected period',
          issues: { rosterDate: ['Must be within the selected period'] }
        }
      };
    }

    const [staff, shiftType] = await Promise.all([
      prisma.staff.findUnique({
        where: { id: data.staffId },
        select: {
          id: true,
          code: true,
          name: true,
          employmentDetails: true
        }
      }),
      prisma.shiftType.findUnique({
        where: { id: data.shiftTypeId },
        select: {
          id: true,
          durationHours: true
        }
      })
    ]);

    if (!staff) {
      return { success: false, error: { message: 'Staff member not found' } };
    }
    if (!shiftType) {
      return { success: false, error: { message: 'Shift type not found' } };
    }

    const employment = (staff.employmentDetails as { employment?: { roster?: string | null } } | null)?.employment;
    const rosterValue = (data.roster ?? employment?.roster ?? '').trim();
    const department = (data.department ?? '').trim();
    const unit = (data.unit ?? '').trim();

    const existingAllocation = data.allocationId
      ? await prisma.rosterAllocation.findUnique({
          where: { id: data.allocationId },
          select: {
            id: true,
            shiftRosterId: true,
            status: true,
            dutyLocation: true,
            supervisorId: true,
            supervisorName: true,
            attendance: true
          }
        })
      : null;

    let supervisorName = existingAllocation?.supervisorName ?? '';
    let supervisorId =
      data.supervisorId !== undefined
        ? data.supervisorId?.trim() || null
        : (existingAllocation?.supervisorId ?? null);

    if (data.supervisorId !== undefined) {
      if (supervisorId) {
        const supervisor = await prisma.staff.findUnique({
          where: { id: supervisorId },
          select: { name: true }
        });
        supervisorName = supervisor?.name ?? '';
      } else {
        supervisorName = '';
      }
    }

    const publishedPeriod = await prisma.shiftRoster.findFirst({
      where: {
        department,
        unit,
        roster: rosterValue,
        status: 'published',
        fromDate: { lte: rosterDate },
        toDate: { gte: rosterDate }
      },
      select: { id: true }
    });

    if (
      publishedPeriod &&
      (!existingAllocation ||
        existingAllocation.status === 'published' ||
        existingAllocation.shiftRosterId === publishedPeriod.id)
    ) {
      return {
        success: false,
        error: {
          message:
            'This date is already published. Use a roster amendment before changing it.',
          issues: {
            rosterDate: ['Published roster dates cannot be changed directly']
          }
        }
      };
    }

    const duplicate = await prisma.rosterAllocation.findFirst({
      where: {
        staffId: data.staffId,
        date: rosterDate,
        ...(data.allocationId ? { id: { not: data.allocationId } } : {})
      },
      select: { id: true }
    });

    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'A roster allocation already exists for this staff member on that date',
          issues: { rosterDate: ['Duplicate staff/date allocation is not allowed'] }
        }
      };
    }

    const shiftRosterId = await ensureDraftShiftRoster({
      department,
      unit,
      roster: rosterValue,
      fromDate: periodFromDate,
      toDate: periodToDate,
      user
    });

    const auditUser = toAuditUser(user);
    const allocationData = {
      shiftRosterId,
      staffId: data.staffId,
      shiftTypeId: data.shiftTypeId,
      date: rosterDate,
      staffCode: staff.code ?? '',
      staffName: staff.name ?? '',
      department,
      unit,
      roster: rosterValue,
      status: 'draft',
      isLeave: data.isLeave ?? false,
      hours: shiftType.durationHours ?? 0,
      otHours: data.otHours ?? 0,
      comments: data.comments?.trim() ?? '',
      dutyLocation:
        data.dutyLocation !== undefined
          ? (data.dutyLocation?.trim() ?? '')
          : (existingAllocation?.dutyLocation ?? ''),
      supervisorId,
      supervisorName,
      attendance:
        data.attendance !== undefined
          ? data.attendance
          : (existingAllocation?.attendance ?? null),
      updatedBy: auditUser?.id
    };

    if (data.allocationId) {
      if (!existingAllocation) {
        return { success: false, error: { message: 'Roster allocation not found' } };
      }

      const updated = await prisma.rosterAllocation.update({
        where: { id: data.allocationId },
        data: allocationData,
        select: { id: true, shiftRosterId: true }
      });

      return {
        success: true,
        data: { id: updated.id, shiftRosterId: updated.shiftRosterId },
        message: 'Roster allocation updated'
      };
    }

    const created = await prisma.rosterAllocation.create({
      data: {
        ...allocationData,
        createdBy: auditUser?.id
      },
      select: { id: true, shiftRosterId: true }
    });

    return {
      success: true,
      data: { id: created.id, shiftRosterId: created.shiftRosterId },
      message: 'Roster allocation created'
    };
  } catch (error: any) {
    console.error('saveRosterAllocationDraft error:', error);
    if (error?.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A roster allocation already exists for this staff member on that date',
          issues: { rosterDate: ['Duplicate staff/date allocation is not allowed'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to save roster allocation draft' }
    };
  }
}

export async function toggleRosterAllocationLeave(
  payload: ToggleRosterAllocationLeavePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { id: string; isLeave: boolean };
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = toggleLeaveSchema.safeParse(payload);
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
      where: { id: parsed.data.allocationId },
      select: {
        id: true,
        shiftRoster: { select: { status: true } }
      }
    });

    if (!existing) {
      return { success: false, error: { message: 'Roster allocation not found' } };
    }
    if (existing.shiftRoster.status === 'published') {
      return {
        success: false,
        error: {
          message:
            'This date is already published. Use a roster amendment before changing it.',
          issues: { allocationId: ['Published roster dates cannot be changed directly'] }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.rosterAllocation.update({
      where: { id: parsed.data.allocationId },
      data: {
        isLeave: parsed.data.isLeave,
        updatedBy: auditUser?.id
      },
      select: { id: true, isLeave: true }
    });

    return {
      success: true,
      data: updated,
      message: 'Leave flag updated'
    };
  } catch (error: any) {
    console.error('toggleRosterAllocationLeave error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update leave flag' }
    };
  }
}

export async function fillNewRosterDraft(
  input: z.infer<typeof workflowRangeSchema>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { draftCount: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const parsed = workflowRangeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { message: 'Invalid roster range' } };
    }
    const range = normalizeRangeInput(parsed.data);
    const staff = await getScopedStaffForRange(range);
    const created = new Set<string>();

    for (const record of staff) {
      const assignment = record.shiftAssignments[0];
      const employment = (record.employmentDetails as { employment?: { roster?: string | null } } | null)?.employment;
      const rosterValue = range.roster || employment?.roster?.trim() || '';
      const id = await ensureDraftShiftRoster({
        department: assignment?.department ?? '',
        unit: assignment?.unit ?? '',
        roster: rosterValue,
        fromDate: range.fromDate,
        toDate: range.toDate,
        user
      });
      created.add(id);
    }

    return {
      success: true,
      data: { draftCount: created.size },
      message: 'Draft roster prepared'
    };
  } catch (error: any) {
    console.error('fillNewRosterDraft error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to prepare draft roster' }
    };
  }
}

export async function publishRoster(
  input: z.infer<typeof workflowRangeSchema>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { rosterCount: number; allocationCount: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const parsed = workflowRangeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { message: 'Invalid roster range' } };
    }
    const range = normalizeRangeInput(parsed.data);
    const auditUser = toAuditUser(user);

    const rosters = await prisma.shiftRoster.findMany({
      where: {
        fromDate: range.fromDate,
        toDate: range.toDate,
        ...(range.department ? { department: range.department } : {}),
        ...(range.unit ? { unit: range.unit } : {}),
        ...(range.roster ? { roster: range.roster } : {})
      },
      select: { id: true, status: true }
    });

    if (rosters.length === 0) {
      return {
        success: false,
        error: { message: 'No roster period found for the selected range' }
      };
    }

    const draftIds = rosters.filter((r) => r.status === 'draft').map((r) => r.id);
    if (draftIds.length > 0) {
      await prisma.shiftRoster.updateMany({
        where: { id: { in: draftIds } },
        data: {
          status: 'published',
          publishedAt: new Date(),
          publishedBy: auditUser?.id,
          updatedBy: auditUser?.id
        }
      });
      await prisma.rosterAllocation.updateMany({
        where: {
          shiftRosterId: { in: draftIds },
          status: { not: 'published' }
        },
        data: {
          status: 'published',
          updatedBy: auditUser?.id
        }
      });
    }

    const allocationCount = await prisma.rosterAllocation.count({
      where: { shiftRosterId: { in: rosters.map((r) => r.id) }, status: 'published' }
    });

    return {
      success: true,
      data: { rosterCount: rosters.length, allocationCount },
      message: draftIds.length > 0 ? 'Roster published' : 'Roster already published'
    };
  } catch (error: any) {
    console.error('publishRoster error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to publish roster' }
    };
  }
}

async function copyRosterPattern(
  input: z.infer<typeof workflowRangeSchema>,
  user: AuditUser | undefined,
  mode: 'latest' | 'previous_week' | 'previous_month'
): Promise<{
  success: boolean;
  data?: { copied: number; skipped: number };
  message?: string;
  error?: { message?: string };
}> {
  const parsed = workflowRangeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: 'Invalid roster range' } };
  }

  const range = normalizeRangeInput(parsed.data);
  const targetDays = eachDayOfInterval({
    start: range.fromDate,
    end: range.toDate
  });

  let sourceFrom: Date;
  let sourceTo: Date;
  let toTargetDate: (sourceDate: Date) => Date;

  if (mode === 'previous_week') {
    sourceFrom = addDays(range.fromDate, -7);
    sourceTo = addDays(range.toDate, -7);
    toTargetDate = (sourceDate) => addDays(sourceDate, 7);
  } else if (mode === 'previous_month') {
    sourceFrom = subMonths(range.fromDate, 1);
    sourceTo = subMonths(range.toDate, 1);
    toTargetDate = (sourceDate) => addMonths(sourceDate, 1);
  } else {
    sourceTo = addDays(range.fromDate, -1);
    sourceFrom = addDays(sourceTo, -(targetDays.length - 1));
    const shiftDays = targetDays.length;
    toTargetDate = (sourceDate) => addDays(sourceDate, shiftDays);
  }

  const sourceAllocations = await prisma.rosterAllocation.findMany({
    where: {
      status: 'published',
      date: { gte: sourceFrom, lte: sourceTo },
      ...(range.department ? { department: range.department } : {}),
      ...(range.unit ? { unit: range.unit } : {}),
      ...(range.roster ? { roster: range.roster } : {})
    },
    select: {
      staffId: true,
      shiftTypeId: true,
      date: true,
      department: true,
      unit: true,
      roster: true,
      isLeave: true,
      otHours: true,
      comments: true
    },
    orderBy: [{ date: 'asc' }, { staffId: 'asc' }]
  });

  if (sourceAllocations.length === 0) {
    return {
      success: false,
      error: { message: 'No published roster data found to copy from' }
    };
  }

  await fillNewRosterDraft(parsed.data, user);

  let copied = 0;
  let skipped = 0;

  for (const alloc of sourceAllocations) {
    const targetDate = toTargetDate(alloc.date);
    if (targetDate < range.fromDate || targetDate > range.toDate) {
      skipped++;
      continue;
    }

    const existing = await prisma.rosterAllocation.findFirst({
      where: {
        staffId: alloc.staffId,
        date: targetDate
      },
      select: { id: true }
    });
    if (existing) {
      skipped++;
      continue;
    }

    const result = await saveRosterAllocationDraft(
      {
        staffId: alloc.staffId,
        shiftTypeId: alloc.shiftTypeId,
        rosterDate: targetDate,
        periodFromDate: range.fromDate,
        periodToDate: range.toDate,
        department: alloc.department,
        unit: alloc.unit,
        roster: alloc.roster,
        isLeave: alloc.isLeave,
        otHours: alloc.otHours,
        comments: alloc.comments
      },
      user
    );

    if (result.success) copied++;
    else skipped++;
  }

  return {
    success: true,
    data: { copied, skipped },
    message: 'Roster pattern copied'
  };
}

export async function copyPreviousWeekRoster(
  input: z.infer<typeof workflowRangeSchema>,
  user?: AuditUser
) {
  try {
    return await copyRosterPattern(input, user, 'previous_week');
  } catch (error: any) {
    console.error('copyPreviousWeekRoster error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to copy previous week roster' }
    };
  }
}

export async function copyPreviousMonthRoster(
  input: z.infer<typeof workflowRangeSchema>,
  user?: AuditUser
) {
  try {
    return await copyRosterPattern(input, user, 'previous_month');
  } catch (error: any) {
    console.error('copyPreviousMonthRoster error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to copy previous month roster' }
    };
  }
}

export async function fillOldRosterDraft(
  input: z.infer<typeof workflowRangeSchema>,
  user?: AuditUser
) {
  try {
    return await copyRosterPattern(input, user, 'latest');
  } catch (error: any) {
    console.error('fillOldRosterDraft error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fill from old roster' }
    };
  }
}
