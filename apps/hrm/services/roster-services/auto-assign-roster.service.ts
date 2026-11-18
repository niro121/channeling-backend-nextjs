import { eachDayOfInterval, format, startOfDay } from 'date-fns';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import {
  assertLeaveSoftWarn,
  hasApprovedLeaveOverlappingDuty
} from '@/lib/helpers/roster/leave-roster-soft-warn.helper';
import { assertWeeklyOffSoftWarn } from '@/lib/helpers/roster/weekly-off-soft-warn.helper';
import { saveRosterAllocationDraft } from '@/services/roster-services/shift-roster.service';

/**
 * Phase E rotation strategies.
 * E1 = fixed (same standing shift type every eligible day).
 * E2/E3 plug in later behind the same generate entry.
 */
export type AutoAssignStrategy = 'fixed';

const generateSchema = z.object({
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  department: z.string().optional(),
  unit: z.string().optional(),
  roster: z.string().optional(),
  /** Shift Assignment register: limit to selected standing rows. */
  assignmentIds: z.array(z.string()).optional(),
  acknowledgedWarnings: z.boolean().optional(),
  /** When true, set isLeave on cells that overlap approved leave. */
  markLeaveOnApprovedLeave: z.boolean().optional(),
  strategy: z.enum(['fixed']).optional().default('fixed')
});

export type GenerateAutoAssignDraftInput = z.infer<typeof generateSchema>;

export type GenerateAutoAssignDraftResult = {
  success: boolean;
  data?: {
    created: number;
    skippedOccupied: number;
    skippedIneligible: number;
    skippedHardFail: number;
    candidates: number;
  };
  message?: string;
  error?: {
    message?: string;
    softWarnings?: string[];
    requiresAck?: boolean;
  };
};

type Candidate = {
  staffId: string;
  staffLabel: string;
  shiftTypeId: string;
  assignmentId: string;
  department: string;
  unit: string;
  designation: string;
  rosterCode: string;
  date: Date;
  startTime: string;
  endTime: string;
};

function civilUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

function rosterCodeFromAssignment(input: {
  manageRosterCode?: string | null;
  filterRoster?: string;
}): string {
  const fromManage = (input.manageRosterCode ?? '').trim();
  if (fromManage) {
    return fromManage.includes('_')
      ? fromManage
      : fromManage.toUpperCase();
  }
  const filter = (input.filterRoster ?? '').trim();
  return filter.includes('_') ? filter : filter.toUpperCase();
}

/**
 * E1 Fixed-like: write draft cells from active Fixed + autoAssign standing rules.
 * Empty days only. Soft leave / weekly-off warn + Continue (same as Allocate).
 * Shared by Shift Roster Fill New and Shift Assignment Auto Assign All.
 */
export async function generateAutoAssignDraftCells(
  raw: GenerateAutoAssignDraftInput,
  user?: AuditUser
): Promise<GenerateAutoAssignDraftResult> {
  try {
    const parsed = generateSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: 'Invalid auto-assign range or filters' }
      };
    }

    const input = parsed.data;
    const strategy: AutoAssignStrategy = input.strategy ?? 'fixed';
    if (strategy !== 'fixed') {
      return {
        success: false,
        error: {
          message: `Rotation strategy “${strategy}” is not supported yet. Use Fixed.`
        }
      };
    }

    const fromDate = civilUtc(startOfDay(new Date(input.fromDate)));
    const toDate = civilUtc(startOfDay(new Date(input.toDate)));
    if (toDate < fromDate) {
      return {
        success: false,
        error: { message: 'To date must be on or after from date' }
      };
    }

    const days = eachDayOfInterval({ start: fromDate, end: toDate }).map(
      civilUtc
    );

    const assignmentWhere: Record<string, unknown> = {
      status: 'active',
      autoAssign: true,
      rotationPattern: 'fixed',
      effectiveFrom: { lte: toDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: fromDate } }]
    };

    if (input.assignmentIds?.length) {
      assignmentWhere.id = { in: input.assignmentIds };
    }
    if (input.department?.trim()) {
      assignmentWhere.department = input.department.trim();
    }
    if (input.unit?.trim()) {
      assignmentWhere.unit = input.unit.trim();
    }

    const assignments = await prisma.staffShiftAssignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        staffId: true,
        shiftTypeId: true,
        department: true,
        unit: true,
        designation: true,
        effectiveFrom: true,
        effectiveTo: true,
        staffCode: true,
        staffName: true,
        manageRoster: { select: { code: true } },
        shiftType: {
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true
          }
        },
        staff: {
          select: {
            id: true,
            status: true,
            employmentDetails: true
          }
        }
      },
      orderBy: [{ staffCode: 'asc' }, { effectiveFrom: 'asc' }]
    });

    const filterRoster = input.roster?.trim() ?? '';
    const eligible = assignments.filter((row) => {
      if (row.staff.status !== 1) return false;
      if (row.shiftType.status !== 'active') return false;
      if (filterRoster) {
        const code = (row.manageRoster?.code ?? '').trim().toUpperCase();
        const employment = (
          row.staff.employmentDetails as {
            employment?: { roster?: string | null };
          } | null
        )?.employment;
        const employmentRoster = (employment?.roster ?? '').trim().toUpperCase();
        const key = filterRoster.toUpperCase();
        if (code !== key && employmentRoster !== key) return false;
      }
      return true;
    });

    let skippedIneligible = 0;
    if (input.assignmentIds?.length) {
      skippedIneligible = Math.max(
        0,
        input.assignmentIds.length - eligible.length
      );
    }

    const staffIds = [...new Set(eligible.map((row) => row.staffId))];
    const existingAllocations =
      staffIds.length === 0
        ? []
        : await prisma.rosterAllocation.findMany({
            where: {
              staffId: { in: staffIds },
              date: { gte: fromDate, lte: toDate }
            },
            select: { staffId: true, date: true }
          });

    const occupied = new Set(
      existingAllocations.map(
        (row) => `${row.staffId}|${format(row.date, 'yyyy-MM-dd')}`
      )
    );

    const candidates: Candidate[] = [];
    let skippedOccupied = 0;

    for (const row of eligible) {
      const assignFrom = civilUtc(row.effectiveFrom);
      const assignTo = row.effectiveTo ? civilUtc(row.effectiveTo) : null;
      const rosterCode = rosterCodeFromAssignment({
        manageRosterCode: row.manageRoster?.code,
        filterRoster
      });
      const staffLabel = row.staffName
        ? row.staffCode
          ? `${row.staffName} (${row.staffCode})`
          : row.staffName
        : row.staffCode || row.staffId;

      for (const day of days) {
        if (day < assignFrom) continue;
        if (assignTo && day > assignTo) continue;

        const dayKey = `${row.staffId}|${format(day, 'yyyy-MM-dd')}`;
        if (occupied.has(dayKey)) {
          skippedOccupied++;
          continue;
        }

        candidates.push({
          staffId: row.staffId,
          staffLabel,
          shiftTypeId: row.shiftTypeId,
          assignmentId: row.id,
          department: row.department ?? '',
          unit: row.unit ?? '',
          designation: row.designation ?? '',
          rosterCode,
          date: day,
          startTime: row.shiftType.startTime,
          endTime: row.shiftType.endTime
        });
      }
    }

    if (!candidates.length) {
      return {
        success: true,
        data: {
          created: 0,
          skippedOccupied,
          skippedIneligible,
          skippedHardFail: 0,
          candidates: 0
        },
        message:
          'No empty days to fill for active Fixed Auto Assign assignments in this range.'
      };
    }

    const softWarnings: string[] = [];
    if (!input.acknowledgedWarnings) {
      for (const candidate of candidates) {
        const leaveWarn = await assertLeaveSoftWarn({
          staffId: candidate.staffId,
          date: candidate.date,
          acknowledgedWarnings: false,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          staffLabel: candidate.staffLabel
        });
        const weeklyOffWarn = await assertWeeklyOffSoftWarn({
          staffId: candidate.staffId,
          date: candidate.date,
          acknowledgedWarnings: false,
          staffLabel: candidate.staffLabel
        });
        if (!leaveWarn.ok) softWarnings.push(...leaveWarn.softWarnings);
        if (!weeklyOffWarn.ok) softWarnings.push(...weeklyOffWarn.softWarnings);
      }

      if (softWarnings.length) {
        const unique = [...new Set(softWarnings)];
        return {
          success: false,
          error: {
            message: unique[0],
            softWarnings: unique.slice(0, 12),
            requiresAck: true
          }
        };
      }
    }

    let created = 0;
    let skippedHardFail = 0;
    const periodFromDate = fromDate;
    const periodToDate = toDate;
    const markLeave = Boolean(input.markLeaveOnApprovedLeave);

    for (const candidate of candidates) {
      let isLeave = false;
      if (markLeave) {
        isLeave = await hasApprovedLeaveOverlappingDuty({
          staffId: candidate.staffId,
          date: candidate.date,
          startTime: candidate.startTime,
          endTime: candidate.endTime
        });
      }

      const result = await saveRosterAllocationDraft(
        {
          staffId: candidate.staffId,
          shiftTypeId: candidate.shiftTypeId,
          rosterDate: candidate.date,
          periodFromDate,
          periodToDate,
          department: candidate.department || null,
          unit: candidate.unit || null,
          designation: candidate.designation || null,
          roster: candidate.rosterCode || null,
          isLeave,
          allocationSource: 'standing',
          staffShiftAssignmentId: candidate.assignmentId,
          acknowledgedWarnings: true
        },
        user
      );

      if (result.success) {
        created++;
        occupied.add(
          `${candidate.staffId}|${format(candidate.date, 'yyyy-MM-dd')}`
        );
      } else {
        skippedHardFail++;
      }
    }

    return {
      success: true,
      data: {
        created,
        skippedOccupied,
        skippedIneligible,
        skippedHardFail,
        candidates: candidates.length
      },
      message:
        created > 0
          ? `Created ${created} draft allocation(s).`
          : 'No draft allocations were created.'
    };
  } catch (error: any) {
    console.error('generateAutoAssignDraftCells error:', error);
    return {
      success: false,
      error: {
        message: error.message ?? 'Failed to auto-assign draft cells'
      }
    };
  }
}
