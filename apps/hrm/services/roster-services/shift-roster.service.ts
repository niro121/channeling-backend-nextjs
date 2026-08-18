'use server';

import prisma from '@/lib/prisma';
import {
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek
} from 'date-fns';
import type {
  LoadRosterParams,
  LoadRosterResult,
  RosterAllocationStatus,
  RosterFilterOption,
  RosterFilterOptions,
  RosterGridSummary,
  RosterStaffRow,
  ShiftCell,
  ShiftTypeChip
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
            status: true
          },
          orderBy: { date: 'asc' }
        })
      : [];

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
          shifts[dateKey] = {
            allocationId: alloc.id,
            shiftTypeId: alloc.shiftTypeId,
            code: st?.code ?? '?',
            label: st?.name ?? 'Unknown',
            timeRange: st?.timeRange ?? '—',
            isLeave: alloc.isLeave,
            hours: alloc.hours,
            otHours: alloc.otHours,
            status: alloc.status as RosterAllocationStatus
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

    return {
      success: true,
      data: {
        rows,
        totalRecords,
        summary,
        filterOptions,
        shiftTypes: shiftTypeChips,
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
