'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { getInstitutionName } from '@/types/institution';
import {
  DEPARTMENT_OPTIONS,
  ROSTER_OPTIONS,
  STAFF_CATEGORY_OPTIONS,
  STAFF_DESIGNATION_OPTIONS,
  STAFF_GRADE_OPTIONS
} from '@/types/staff-employment-options';
import {
  PAYSHEET_ASSIGNMENT_CODE_PREFIX,
  type GetPaysheetAssignmentParams,
  type PaysheetAssignmentHistoryEntry,
  type PaysheetAssignmentOverlap,
  type PaysheetAssignmentPayload,
  type PaysheetAssignmentRecord,
  type PaysheetAssignmentStatus
} from '@/types/payroll';

const EXPIRING_WITHIN_DAYS =
  Number.parseInt(
    process.env.PAYSHEET_ASSIGNMENT_EXPIRING_WITHIN_DAYS ?? '30',
    10
  ) || 30;

const payloadSchema = z.object({
  staffId: z.string().min(1, 'Employee is required'),
  componentId: z.string().min(1, 'Paysheet component is required'),
  effectiveFrom: z.coerce.date({
    message: 'Effective from date is required'
  }),
  effectiveTo: z.coerce
    .date({
      message: 'Effective to date is invalid'
    })
    .nullable()
    .optional(),
  value: z.coerce.number().finite('Value must be a number')
});

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function labelFromOptions(
  options: readonly { id: string; name: string }[],
  id: string | null | undefined
): string {
  if (!id) return '';
  return options.find((item) => item.id === id)?.name ?? id;
}

function institutionLabel(id: string | null | undefined): string {
  if (!id) return '';
  const asNum = Number(id);
  if (!Number.isNaN(asNum) && String(asNum) === id) {
    return getInstitutionName(asNum);
  }
  return id;
}

function computeStatus(
  effectiveFrom: Date,
  effectiveTo: Date | null,
  today = startOfDay(new Date())
): PaysheetAssignmentStatus {
  if (effectiveTo && startOfDay(effectiveTo) < today) return 'ended';
  if (effectiveTo) {
    const ms = startOfDay(effectiveTo).getTime() - today.getTime();
    const days = ms / (1000 * 60 * 60 * 24);
    if (days >= 0 && days <= EXPIRING_WITHIN_DAYS) return 'expiring';
  }
  if (startOfDay(effectiveFrom) > today) return 'active';
  return 'active';
}

function rangesOverlap(
  fromA: Date,
  toA: Date | null | undefined,
  fromB: Date,
  toB: Date | null | undefined
): boolean {
  const aEnd = toA ?? new Date('9999-12-31T00:00:00.000Z');
  const bEnd = toB ?? new Date('9999-12-31T00:00:00.000Z');
  return fromA.getTime() <= bEnd.getTime() && fromB.getTime() <= aEnd.getTime();
}

function mapRecord(
  record: {
    id: string;
    code: string;
    staffId: string;
    componentId: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    value: number;
    staffCode: string;
    staffName: string;
    componentName: string;
    institution: string;
    department: string;
    roster: string;
    grade: string;
    staffCategory: string;
    designation: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    createdUser?: AuthUserSummary | null;
    updatedUser?: AuthUserSummary | null;
  }
): PaysheetAssignmentRecord {
  return {
    id: record.id,
    code: record.code,
    staffId: record.staffId,
    institution: record.institution || '—',
    department: record.department || '—',
    roster: record.roster || '—',
    staffCode: record.staffCode,
    staffName: record.staffName,
    componentId: record.componentId,
    componentName: record.componentName,
    effectiveFrom: toIsoString(record.effectiveFrom),
    effectiveTo: toIsoString(record.effectiveTo),
    grade: record.grade || '—',
    staffCategory: record.staffCategory || '—',
    designation: record.designation || '—',
    status: computeStatus(record.effectiveFrom, record.effectiveTo),
    value: record.value,
    createdBy: record.createdUser?.name ?? null,
    createdAt: toIsoString(record.createdAt),
    updatedBy: record.updatedUser?.name ?? null,
    updatedAt: toIsoString(record.updatedAt)
  };
}

const assignmentSelect = {
  id: true,
  code: true,
  staffId: true,
  componentId: true,
  effectiveFrom: true,
  effectiveTo: true,
  value: true,
  staffCode: true,
  staffName: true,
  componentName: true,
  epfNumber: true,
  institution: true,
  institutionId: true,
  department: true,
  departmentId: true,
  roster: true,
  rosterId: true,
  grade: true,
  staffCategory: true,
  staffCategoryId: true,
  designation: true,
  designationId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

function buildWhere(
  params: GetPaysheetAssignmentParams
): Prisma.PaysheetAssignmentWhereInput {
  const and: Prisma.PaysheetAssignmentWhereInput[] = [];

  if (params.staffId) and.push({ staffId: params.staffId });
  if (params.componentId) and.push({ componentId: params.componentId });

  const staffCode = params.staffCode?.trim();
  if (staffCode) {
    and.push({
      staffCode: { contains: staffCode, mode: Prisma.QueryMode.insensitive }
    });
  }

  const epfNumber = params.epfNumber?.trim();
  if (epfNumber) {
    and.push({
      epfNumber: { contains: epfNumber, mode: Prisma.QueryMode.insensitive }
    });
  }

  if (params.departmentId) and.push({ departmentId: params.departmentId });
  if (params.institution && params.institution !== '__all__') {
    and.push({ institutionId: params.institution });
  }
  if (params.staffCategory) {
    and.push({ staffCategoryId: params.staffCategory });
  }
  if (params.designationId) {
    and.push({ designationId: params.designationId });
  }
  if (params.rosterId) and.push({ rosterId: params.rosterId });

  // Filter assignments that intersect [fromDate, toDate]
  if (params.fromDate) {
    const from = new Date(params.fromDate);
    and.push({
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }]
    });
  }
  if (params.toDate) {
    const to = new Date(params.toDate);
    and.push({ effectiveFrom: { lte: to } });
  }

  return and.length ? { AND: and } : {};
}

function fieldError(
  field: string,
  message: string
): {
  success: false;
  error: { message: string; issues: Record<string, string[]> };
} {
  return {
    success: false,
    error: {
      message,
      issues: { [field]: [message] }
    }
  };
}

async function findOverlaps(params: {
  staffId: string;
  componentId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null | undefined;
  excludeId?: string;
}): Promise<PaysheetAssignmentOverlap[]> {
  const candidates = await prisma.paysheetAssignment.findMany({
    where: {
      staffId: params.staffId,
      componentId: params.componentId,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {})
    },
    select: {
      id: true,
      code: true,
      staffName: true,
      staffCode: true,
      componentName: true,
      effectiveFrom: true,
      effectiveTo: true
    }
  });

  return candidates
    .filter((row) =>
      rangesOverlap(
        params.effectiveFrom,
        params.effectiveTo,
        row.effectiveFrom,
        row.effectiveTo
      )
    )
    .map((row) => ({
      id: row.id,
      code: row.code,
      staffName: row.staffName,
      staffCode: row.staffCode,
      componentName: row.componentName,
      effectiveFrom: toIsoString(row.effectiveFrom),
      effectiveTo: toIsoString(row.effectiveTo)
    }));
}

async function resolveStaffSnapshot(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      code: true,
      name: true,
      hrDetails: true,
      employmentDetails: true
    }
  });
  if (!staff) return null;

  const employment = staff.employmentDetails?.employment;
  const institutionId = employment?.institution ?? '';
  const departmentId = employment?.department ?? '';
  const staffCategoryId = employment?.staffCategory ?? '';
  const designationId = employment?.staffDesignation ?? '';
  const gradeId = employment?.staffGrade ?? '';
  const rosterId = employment?.roster ?? '';

  return {
    staffCode: staff.code,
    staffName: staff.name,
    epfNumber: staff.hrDetails?.epfNumber ?? '',
    institutionId,
    institution: institutionLabel(institutionId),
    departmentId,
    department: labelFromOptions(DEPARTMENT_OPTIONS, departmentId),
    staffCategoryId,
    staffCategory: labelFromOptions(STAFF_CATEGORY_OPTIONS, staffCategoryId),
    designationId,
    designation: labelFromOptions(STAFF_DESIGNATION_OPTIONS, designationId),
    grade: labelFromOptions(STAFF_GRADE_OPTIONS, gradeId),
    rosterId,
    roster: labelFromOptions(ROSTER_OPTIONS, rosterId)
  };
}

async function resolveComponentSnapshot(componentId: string) {
  const component = await prisma.paysheetComponent.findUnique({
    where: { id: componentId },
    select: { id: true, name: true, percentage: true, typeId: true }
  });
  if (!component) return null;
  return {
    componentName: component.name,
    defaultPercentage: component.percentage
  };
}

export async function getPaysheetAssignmentList(
  params: GetPaysheetAssignmentParams = {}
): Promise<{
  success: boolean;
  data?: PaysheetAssignmentRecord[];
  total?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const pageNumber = Math.max(
      1,
      Number(params.page) ||
        Number.parseInt(process.env.DEFAULT_PAGE ?? '0', 10) ||
        1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number(params.limit) ||
          Number.parseInt(defaultPerPage, 10) ||
          10
      )
    );
    const skip = (pageNumber - 1) * pageSize;

    const [total, rows] = await Promise.all([
      prisma.paysheetAssignment.count({ where }),
      prisma.paysheetAssignment.findMany({
        where,
        select: assignmentSelect,
        orderBy: [{ updatedAt: 'desc' }, { staffName: 'asc' }],
        skip,
        take: pageSize
      })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: withUsers.map(mapRecord),
      total
    };
  } catch (error: any) {
    console.error('getPaysheetAssignmentList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch assignments' }
    };
  }
}

export async function getPaysheetAssignmentById(id: string): Promise<{
  success: boolean;
  data?: PaysheetAssignmentRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid assignment ID' } };
    }
    const record = await prisma.paysheetAssignment.findUnique({
      where: { id },
      select: assignmentSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Assignment not found' } };
    }
    const [withUsers] = await resolveAuthUsers([record]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('getPaysheetAssignmentById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get assignment' }
    };
  }
}

export async function checkPaysheetAssignmentOverlap(
  payload: PaysheetAssignmentPayload,
  excludeId?: string
): Promise<{
  success: boolean;
  data?: PaysheetAssignmentOverlap[];
  error?: { message?: string };
}> {
  try {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: 'Validation failed' }
      };
    }
    const overlaps = await findOverlaps({
      staffId: parsed.data.staffId,
      componentId: parsed.data.componentId,
      effectiveFrom: parsed.data.effectiveFrom,
      effectiveTo: parsed.data.effectiveTo ?? null,
      excludeId
    });
    return { success: true, data: overlaps };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || 'Failed to check overlap' }
    };
  }
}

export async function createPaysheetAssignment(
  payload: PaysheetAssignmentPayload,
  user?: AuditUser,
  options?: { allowOverlap?: boolean }
): Promise<{
  success: boolean;
  data?: PaysheetAssignmentRecord;
  overlaps?: PaysheetAssignmentOverlap[];
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    if (
      parsed.data.effectiveTo &&
      parsed.data.effectiveTo < parsed.data.effectiveFrom
    ) {
      return fieldError(
        'effectiveTo',
        'Effective to must be on or after effective from'
      );
    }

    const staffSnap = await resolveStaffSnapshot(parsed.data.staffId);
    if (!staffSnap) {
      return fieldError('staffId', 'Staff member not found');
    }

    const componentSnap = await resolveComponentSnapshot(
      parsed.data.componentId
    );
    if (!componentSnap) {
      return fieldError('componentId', 'Paysheet component not found');
    }

    const overlaps = await findOverlaps({
      staffId: parsed.data.staffId,
      componentId: parsed.data.componentId,
      effectiveFrom: parsed.data.effectiveFrom,
      effectiveTo: parsed.data.effectiveTo ?? null
    });
    if (overlaps.length && !options?.allowOverlap) {
      return {
        success: false,
        overlaps,
        error: {
          message: `Overlapping assignment exists (${overlaps[0].code}). Adjust dates or remove the existing assignment.`,
          issues: {
            effectiveFrom: [
              'Date range overlaps an existing assignment for this staff and component'
            ]
          }
        }
      };
    }

    const generated = await generateRecordCode(
      PAYSHEET_ASSIGNMENT_CODE_PREFIX
    );
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate assignment code' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.paysheetAssignment.create({
      data: {
        code: generated.code,
        staffId: parsed.data.staffId,
        componentId: parsed.data.componentId,
        effectiveFrom: parsed.data.effectiveFrom,
        effectiveTo: parsed.data.effectiveTo ?? null,
        value: parsed.data.value,
        ...staffSnap,
        componentName: componentSnap.componentName,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: assignmentSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('createPaysheetAssignment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create assignment' }
    };
  }
}

export async function updatePaysheetAssignment(
  id: string,
  payload: PaysheetAssignmentPayload,
  user?: AuditUser,
  options?: { allowOverlap?: boolean }
): Promise<{
  success: boolean;
  data?: PaysheetAssignmentRecord;
  overlaps?: PaysheetAssignmentOverlap[];
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid assignment ID' } };
    }

    const existing = await prisma.paysheetAssignment.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Assignment not found' } };
    }

    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    if (
      parsed.data.effectiveTo &&
      parsed.data.effectiveTo < parsed.data.effectiveFrom
    ) {
      return fieldError(
        'effectiveTo',
        'Effective to must be on or after effective from'
      );
    }

    const staffSnap = await resolveStaffSnapshot(parsed.data.staffId);
    if (!staffSnap) {
      return fieldError('staffId', 'Staff member not found');
    }

    const componentSnap = await resolveComponentSnapshot(
      parsed.data.componentId
    );
    if (!componentSnap) {
      return fieldError('componentId', 'Paysheet component not found');
    }

    const overlaps = await findOverlaps({
      staffId: parsed.data.staffId,
      componentId: parsed.data.componentId,
      effectiveFrom: parsed.data.effectiveFrom,
      effectiveTo: parsed.data.effectiveTo ?? null,
      excludeId: id
    });
    if (overlaps.length && !options?.allowOverlap) {
      return {
        success: false,
        overlaps,
        error: {
          message: `Overlapping assignment exists (${overlaps[0].code}).`,
          issues: {
            effectiveFrom: [
              'Date range overlaps an existing assignment for this staff and component'
            ]
          }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.paysheetAssignment.update({
      where: { id },
      data: {
        staffId: parsed.data.staffId,
        componentId: parsed.data.componentId,
        effectiveFrom: parsed.data.effectiveFrom,
        effectiveTo: parsed.data.effectiveTo ?? null,
        value: parsed.data.value,
        ...staffSnap,
        componentName: componentSnap.componentName,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: assignmentSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('updatePaysheetAssignment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update assignment' }
    };
  }
}

export async function deletePaysheetAssignment(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid assignment ID' } };
    }
    const existing = await prisma.paysheetAssignment.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Assignment not found' } };
    }
    await prisma.paysheetAssignment.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deletePaysheetAssignment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete assignment' }
    };
  }
}

export async function getPaysheetAssignmentExportRows(
  params: GetPaysheetAssignmentParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, string>[];
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const rows = await prisma.paysheetAssignment.findMany({
      where,
      select: assignmentSelect,
      orderBy: [{ staffName: 'asc' }, { effectiveFrom: 'desc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    const mapped = withUsers.map(mapRecord);

    return {
      success: true,
      data: mapped.map((row) => ({
        institution: row.institution,
        department: row.department,
        roster: row.roster,
        staffCode: row.staffCode,
        staffName: row.staffName,
        componentName: row.componentName,
        effectiveFrom: row.effectiveFrom ?? '—',
        effectiveTo: row.effectiveTo ?? '—',
        grade: row.grade,
        staffCategory: row.staffCategory,
        designation: row.designation,
        status: row.status,
        value: String(row.value),
        createdBy: row.createdBy ?? '—',
        createdAt: row.createdAt ?? '—',
        updatedBy: row.updatedBy ?? '—',
        updatedAt: row.updatedAt ?? '—'
      }))
    };
  } catch (error: any) {
    console.error('getPaysheetAssignmentExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export assignments' }
    };
  }
}

const HISTORY_TITLES: Record<string, string> = {
  'assign-paysheet-component.created': 'Assignment created',
  'assign-paysheet-component.updated': 'Assignment updated',
  'assign-paysheet-component.deleted': 'Assignment deleted'
};

export async function getPaysheetAssignmentHistory(id: string): Promise<{
  success: boolean;
  data?: PaysheetAssignmentHistoryEntry[];
  error?: { message?: string };
}> {
  try {
    const record = await prisma.paysheetAssignment.findUnique({
      where: { id },
      select: {
        id: true,
        staffName: true,
        staffCode: true,
        componentName: true,
        value: true
      }
    });
    if (!record) {
      return { success: false, error: { message: 'Assignment not found' } };
    }

    const logs = await prisma.activityLog.findMany({
      where: { entityType: 'PaysheetAssignment', entityId: id },
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

    const entries: PaysheetAssignmentHistoryEntry[] = withUsers.map((log) => {
      const metadata = (log.metadata ?? {}) as {
        staffName?: string;
        componentName?: string;
        value?: number;
      };
      const staffName = metadata.staffName || record.staffName;
      const componentName = metadata.componentName || record.componentName;
      return {
        id: log.id,
        title: HISTORY_TITLES[log.action] ?? 'Assignment updated',
        detail: `${componentName} for ${staffName} (${record.staffCode}).`,
        userLabel: log.createdUser?.name ?? '—',
        at: toIsoString(log.createdAt) ?? ''
      };
    });

    return { success: true, data: entries };
  } catch (error: any) {
    console.error('getPaysheetAssignmentHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load history' }
    };
  }
}
