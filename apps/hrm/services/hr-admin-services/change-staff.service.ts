'use server';

import { format } from 'date-fns';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  CHANGE_STAFF_FIELDS,
  type ApplyChangeStaffPayload,
  type ChangeStaffFieldId,
  type ChangeStaffGuardResult,
  type ChangeStaffHistoryRow,
  type ChangeStaffMemberOption
} from '@/types/change-staff';

const FIELD_SET = new Set<string>(CHANGE_STAFF_FIELDS);

/** Payroll statuses treated as posted / locked for Active From hard block. */
const POSTED_PAYROLL_STATUSES = ['processed', 'on_hold', 'paid'] as const;

const applyChangeSchema = z.object({
  staffId: z.string().min(1, 'Staff is required'),
  activeFrom: z.coerce.date(),
  departmentId: z.string().optional(),
  employeeStatusId: z.string().optional(),
  categoryId: z.string().optional(),
  gradeId: z.string().optional(),
  designationId: z.string().optional(),
  basic: z.string().optional(),
  acknowledgedWarnings: z.boolean().optional(),
  labels: z
    .object({
      department: z.string().optional(),
      employeeStatus: z.string().optional(),
      category: z.string().optional(),
      grade: z.string().optional(),
      designation: z.string().optional(),
      basic: z.string().optional()
    })
    .optional()
});

function toDisplayDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'dd MMM yyyy');
}

function mapHistoryRow(row: {
  id: string;
  staffId: string;
  field: string;
  value: string;
  valueLabel: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  changedByName: string;
}): ChangeStaffHistoryRow | null {
  if (!FIELD_SET.has(row.field)) return null;
  return {
    id: row.id,
    staffId: row.staffId,
    field: row.field as ChangeStaffFieldId,
    from: toDisplayDate(row.effectiveFrom),
    to: toDisplayDate(row.effectiveTo),
    value: row.valueLabel || row.value || '—',
    changeUser: row.changedByName || '—'
  };
}

function mapMember(record: {
  id: string;
  code: string;
  name: string;
  nic: string;
  dateJoined: Date | null;
  hrDetails: { epfNumber: string | null } | null;
  employmentDetails: {
    employment: {
      department: string | null;
      employeeStatus: string | null;
      staffCategory: string | null;
      staffGrade: string | null;
      staffDesignation: string | null;
      basic: number | null;
    } | null;
  } | null;
}): ChangeStaffMemberOption {
  const emp = record.employmentDetails?.employment;
  return {
    id: record.id,
    name: record.name,
    staffCode: record.code,
    epfNumber: record.hrDetails?.epfNumber ?? '—',
    nic: record.nic || '—',
    joinedLabel: toDisplayDate(record.dateJoined) || '—',
    departmentId: emp?.department ?? '',
    employeeStatusId: emp?.employeeStatus ?? '',
    categoryId: emp?.staffCategory ?? '',
    gradeId: emp?.staffGrade ?? '',
    designationId: emp?.staffDesignation ?? '',
    basic:
      emp?.basic != null && Number.isFinite(emp.basic)
        ? String(emp.basic)
        : ''
  };
}

const staffMemberSelect = {
  id: true,
  code: true,
  name: true,
  nic: true,
  dateJoined: true,
  hrDetails: { select: { epfNumber: true } },
  employmentDetails: {
    select: {
      employment: {
        select: {
          department: true,
          employeeStatus: true,
          staffCategory: true,
          staffGrade: true,
          staffDesignation: true,
          basic: true
        }
      }
    }
  }
} as const;

/** Active staff for Change Staff picker + current employment snapshot. */
export async function getChangeStaffMembers(): Promise<{
  success: boolean;
  data?: ChangeStaffMemberOption[];
  error?: { message?: string };
}> {
  try {
    const rows = await prisma.staff.findMany({
      where: { status: 1 },
      select: staffMemberSelect,
      orderBy: { name: 'asc' }
    });
    return { success: true, data: rows.map(mapMember) };
  } catch (error: any) {
    console.error('getChangeStaffMembers error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load staff' }
    };
  }
}

export async function getChangeStaffMemberById(staffId: string): Promise<{
  success: boolean;
  data?: ChangeStaffMemberOption;
  error?: { message?: string };
}> {
  try {
    if (!staffId) {
      return { success: false, error: { message: 'Invalid staff ID' } };
    }
    const row = await prisma.staff.findUnique({
      where: { id: staffId },
      select: staffMemberSelect
    });
    if (!row) {
      return { success: false, error: { message: 'Staff not found' } };
    }
    return { success: true, data: mapMember(row) };
  } catch (error: any) {
    console.error('getChangeStaffMemberById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load staff' }
    };
  }
}

export async function getChangeStaffHistory(staffId: string): Promise<{
  success: boolean;
  data?: ChangeStaffHistoryRow[];
  error?: { message?: string };
}> {
  try {
    if (!staffId) {
      return { success: false, error: { message: 'Invalid staff ID' } };
    }
    const rows = await prisma.staffEmploymentChange.findMany({
      where: { staffId },
      orderBy: [{ field: 'asc' }, { effectiveFrom: 'desc' }]
    });
    return {
      success: true,
      data: rows
        .map(mapHistoryRow)
        .filter((row): row is ChangeStaffHistoryRow => Boolean(row))
    };
  } catch (error: any) {
    console.error('getChangeStaffHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load history' }
    };
  }
}

type ChangeSpec = {
  field: ChangeStaffFieldId;
  value: string;
  valueLabel: string;
};

function dayBefore(activeFrom: Date): Date {
  const d = new Date(activeFrom);
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

type EmploymentSnapshot = {
  department: string | null;
  employeeStatus: string | null;
  staffCategory: string | null;
  staffGrade: string | null;
  staffDesignation: string | null;
  basic: number | null;
  roster: string | null;
} | null;

function collectPendingChanges(
  data: z.infer<typeof applyChangeSchema>,
  current: EmploymentSnapshot
): { changes: ChangeSpec[]; error?: { message: string; issues?: Record<string, string[]> } } {
  const labels = data.labels ?? {};
  const changes: ChangeSpec[] = [];

  const pushIfChanged = (
    field: ChangeStaffFieldId,
    nextRaw: string | undefined,
    prevRaw: string | null | undefined,
    label?: string
  ) => {
    if (nextRaw === undefined) return;
    const next = nextRaw.trim();
    const prev = (prevRaw ?? '').trim();
    if (next === prev) return;
    changes.push({
      field,
      value: next,
      valueLabel: (label ?? next) || '—'
    });
  };

  pushIfChanged(
    'department',
    data.departmentId,
    current?.department,
    labels.department
  );
  pushIfChanged(
    'employeeStatus',
    data.employeeStatusId,
    current?.employeeStatus,
    labels.employeeStatus
  );
  pushIfChanged(
    'category',
    data.categoryId,
    current?.staffCategory,
    labels.category
  );
  pushIfChanged('grade', data.gradeId, current?.staffGrade, labels.grade);
  pushIfChanged(
    'designation',
    data.designationId,
    current?.staffDesignation,
    labels.designation
  );

  if (data.basic !== undefined) {
    const nextBasic = data.basic.trim();
    const nextNum = Number(nextBasic);
    if (!Number.isFinite(nextNum) || nextNum <= 0) {
      return {
        changes: [],
        error: {
          message: 'Validation failed',
          issues: { basic: ['Must be a positive number'] }
        }
      };
    }
    const prevBasic =
      current?.basic != null && Number.isFinite(current.basic)
        ? String(current.basic)
        : '';
    if (nextBasic !== prevBasic) {
      changes.push({
        field: 'basic',
        value: nextBasic,
        valueLabel: labels.basic ?? nextBasic
      });
    }
  }

  return { changes };
}

/**
 * CS3 — posted payroll hard block + roster/dept soft warns (no cascade).
 */
export async function evaluateChangeStaffGuards(
  payload: ApplyChangeStaffPayload
): Promise<{
  success: boolean;
  data?: ChangeStaffGuardResult & { hasChanges: boolean };
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = applyChangeSchema.safeParse(payload);
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
    const activeFrom = startOfUtcDay(data.activeFrom);

    const existing = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: {
        id: true,
        employmentDetails: {
          select: {
            employment: {
              select: {
                department: true,
                employeeStatus: true,
                staffCategory: true,
                staffGrade: true,
                staffDesignation: true,
                basic: true,
                roster: true
              }
            }
          }
        }
      }
    });
    if (!existing) {
      return { success: false, error: { message: 'Staff not found' } };
    }

    const current = existing.employmentDetails?.employment ?? null;
    const { changes, error: changeError } = collectPendingChanges(data, current);
    if (changeError) {
      return { success: false, error: changeError };
    }
    if (!changes.length) {
      return {
        success: true,
        data: { hardBlocks: [], softWarnings: [], hasChanges: false }
      };
    }

    const hardBlocks: string[] = [];
    const softWarnings: string[] = [];

    // Hard: Active From falls inside a posted payroll window that includes this staff.
    const postedRuns = await prisma.payrollRun.findMany({
      where: {
        status: { in: [...POSTED_PAYROLL_STATUSES] },
        salaryFromDate: { lte: endOfUtcDay(activeFrom) },
        salaryToDate: { gte: activeFrom }
      },
      select: { id: true, code: true, status: true, cycleLabel: true },
      take: 20
    });

    if (postedRuns.length) {
      const runIds = postedRuns.map((r) => r.id);
      const line = await prisma.payrollRunLine.findFirst({
        where: {
          staffId: data.staffId,
          payrollRunId: { in: runIds }
        },
        select: { payrollRunId: true }
      });
      if (line) {
        const run = postedRuns.find((r) => r.id === line.payrollRunId);
        const label = run
          ? `${run.code}${run.cycleLabel ? ` (${run.cycleLabel})` : ''} — ${run.status}`
          : 'a posted payroll run';
        hardBlocks.push(
          `Active From falls in posted payroll ${label}. Change the effective date to a period that is not processed, on hold, or paid.`
        );
      }
    }

    const changingFields = new Set(changes.map((c) => c.field));
    if (
      changingFields.has('department') ||
      changingFields.has('grade') ||
      changingFields.has('designation') ||
      changingFields.has('basic')
    ) {
      softWarnings.push(
        'This updates employment history only. Roster membership, duty allocations, and paysheet / salary structure rows are not rewritten automatically.'
      );
    }

    // Soft: staff roster master department differs from the new working department.
    if (changingFields.has('department') && data.departmentId) {
      const nextDept = data.departmentId.trim();
      const rosterKey = (current?.roster ?? '').trim();
      if (rosterKey && nextDept) {
        const manageRoster = await prisma.manageRoster.findFirst({
          where: {
            OR: [{ id: rosterKey }, { code: rosterKey }]
          },
          select: {
            id: true,
            code: true,
            name: true,
            departmentId: true,
            department: { select: { name: true } }
          }
        });
        if (manageRoster && manageRoster.departmentId !== nextDept) {
          softWarnings.push(
            `Staff roster "${manageRoster.name}" (${manageRoster.code}) belongs to department "${manageRoster.department?.name ?? manageRoster.departmentId}", which differs from the new working department. Update Manage Rosters / Employment roster separately if needed.`
          );
        }
      }
    }

    return {
      success: true,
      data: {
        hardBlocks,
        softWarnings: [...new Set(softWarnings)],
        hasChanges: true
      }
    };
  } catch (error: any) {
    console.error('evaluateChangeStaffGuards error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to evaluate guards' }
    };
  }
}

/**
 * Apply employment attribute changes from Active From:
 * - close open history segments (effectiveTo = day before Active From)
 * - insert new open segments
 * - update Staff.employmentDetails.employment current snapshot
 */
export async function applyChangeStaff(
  payload: ApplyChangeStaffPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: {
    member: ChangeStaffMemberOption;
    history: ChangeStaffHistoryRow[];
  };
  error?: {
    message?: string;
    issues?: Record<string, string[]>;
    hardBlocks?: string[];
    softWarnings?: string[];
    requiresAck?: boolean;
  };
}> {
  try {
    const parsed = applyChangeSchema.safeParse(payload);
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
    const activeFrom = startOfUtcDay(data.activeFrom);
    const priorTo = dayBefore(activeFrom);

    const guardRes = await evaluateChangeStaffGuards(payload);
    if (!guardRes.success || !guardRes.data) {
      return {
        success: false,
        error: {
          message: guardRes.error?.message ?? 'Guard check failed',
          issues: guardRes.error?.issues
        }
      };
    }

    if (!guardRes.data.hasChanges) {
      return {
        success: false,
        error: { message: 'No changes to apply' }
      };
    }

    if (guardRes.data.hardBlocks.length) {
      return {
        success: false,
        error: {
          message: guardRes.data.hardBlocks[0],
          hardBlocks: guardRes.data.hardBlocks
        }
      };
    }

    if (
      guardRes.data.softWarnings.length &&
      !data.acknowledgedWarnings
    ) {
      return {
        success: false,
        error: {
          message: 'Confirmation required',
          softWarnings: guardRes.data.softWarnings,
          requiresAck: true
        }
      };
    }

    const existing = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: {
        id: true,
        employmentDetails: {
          select: {
            welfare: true,
            employment: true,
            payroll: true,
            workingHours: true,
            permissions: true,
            notes: true
          }
        }
      }
    });
    if (!existing) {
      return { success: false, error: { message: 'Staff not found' } };
    }

    const current = existing.employmentDetails?.employment;
    const { changes, error: changeError } = collectPendingChanges(
      data,
      current ?? null
    );
    if (changeError) {
      return { success: false, error: changeError };
    }

    if (!changes.length) {
      return {
        success: false,
        error: { message: 'No changes to apply' }
      };
    }

    const auditUser = toAuditUser(user);
    const changedByName = auditUser?.name?.trim() || 'System';

    // Sequential writes (Mongo without replica set cannot use interactive $transaction).
    for (const change of changes) {
      await prisma.staffEmploymentChange.updateMany({
        where: {
          staffId: data.staffId,
          field: change.field,
          effectiveTo: null
        },
        data: { effectiveTo: priorTo }
      });

      await prisma.staffEmploymentChange.create({
        data: {
          staffId: data.staffId,
          field: change.field,
          value: change.value,
          valueLabel: change.valueLabel,
          effectiveFrom: activeFrom,
          effectiveTo: null,
          changedBy: auditUser?.id,
          changedByName
        }
      });
    }

    const nextEmployment = {
      institution: current?.institution ?? null,
      department:
        data.departmentId !== undefined
          ? data.departmentId.trim() || null
          : (current?.department ?? null),
      employeeStatus:
        data.employeeStatusId !== undefined
          ? data.employeeStatusId.trim() || null
          : (current?.employeeStatus ?? null),
      staffCategory:
        data.categoryId !== undefined
          ? data.categoryId.trim() || null
          : (current?.staffCategory ?? null),
      staffGrade:
        data.gradeId !== undefined
          ? data.gradeId.trim() || null
          : (current?.staffGrade ?? null),
      staffDesignation:
        data.designationId !== undefined
          ? data.designationId.trim() || null
          : (current?.staffDesignation ?? null),
      basic:
        data.basic !== undefined
          ? Number(data.basic.trim())
          : (current?.basic ?? null),
      roster: current?.roster ?? null,
      shift: current?.shift ?? null
    };

    const existingDetails = existing.employmentDetails;
    await prisma.staff.update({
      where: { id: data.staffId },
      data: {
        employmentDetails: {
          welfare: existingDetails?.welfare ?? undefined,
          employment: nextEmployment,
          payroll: existingDetails?.payroll ?? undefined,
          workingHours: existingDetails?.workingHours ?? undefined,
          permissions: existingDetails?.permissions ?? undefined,
          notes: existingDetails?.notes ?? undefined
        },
        ...(auditUser?.id && { updatedBy: auditUser.id }),
        updatedAt: new Date()
      }
    });

    const [memberRes, historyRes] = await Promise.all([
      getChangeStaffMemberById(data.staffId),
      getChangeStaffHistory(data.staffId)
    ]);

    if (!memberRes.success || !memberRes.data) {
      return {
        success: false,
        error: { message: memberRes.error?.message ?? 'Failed to reload staff' }
      };
    }

    return {
      success: true,
      data: {
        member: memberRes.data,
        history: historyRes.data ?? []
      }
    };
  } catch (error: any) {
    console.error('applyChangeStaff error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to apply change' }
    };
  }
}
