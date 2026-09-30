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
import {
  DEPARTMENT_OPTIONS,
  STAFF_DESIGNATION_OPTIONS
} from '@/types/staff-employment-options';
import {
  PERFORMANCE_ALLOWANCE_CODE_PREFIX,
  type GetPerformanceAllowanceParams,
  type PerformanceAllowanceMode,
  type PerformanceAllowancePayload,
  type PerformanceAllowanceRecord,
  type PerformanceAllowanceSummary
} from '@/types/payroll';

const modeSchema = z.enum(['percentage', 'fixed']);

const payloadSchema = z.object({
  staffId: z.string().min(1, 'Employee is required'),
  mode: modeSchema,
  value: z.coerce.number().finite('Value must be a number').min(0, 'Value must be ≥ 0'),
  effectiveFrom: z.coerce.date({
    message: 'Effective from date is required'
  }),
  effectiveTo: z.coerce.date({
    message: 'Effective to date is required'
  })
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

function rangesOverlap(
  fromA: Date,
  toA: Date,
  fromB: Date,
  toB: Date
): boolean {
  return fromA.getTime() <= toB.getTime() && fromB.getTime() <= toA.getTime();
}

const recordSelect = {
  id: true,
  code: true,
  staffId: true,
  mode: true,
  value: true,
  effectiveFrom: true,
  effectiveTo: true,
  staffCode: true,
  staffName: true,
  department: true,
  departmentId: true,
  designation: true,
  designationId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

function mapRecord(record: {
  id: string;
  code: string;
  staffId: string;
  mode: string;
  value: number;
  effectiveFrom: Date;
  effectiveTo: Date;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
}): PerformanceAllowanceRecord {
  return {
    id: record.id,
    code: record.code,
    staffId: record.staffId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: record.department || '—',
    designation: record.designation || '—',
    mode: record.mode as PerformanceAllowanceMode,
    value: record.value,
    effectiveFrom: toIsoString(record.effectiveFrom),
    effectiveTo: toIsoString(record.effectiveTo),
    createdBy: record.createdUser?.name ?? null,
    createdAt: toIsoString(record.createdAt),
    updatedBy: record.updatedUser?.name ?? null,
    updatedAt: toIsoString(record.updatedAt)
  };
}

function buildWhere(
  params: GetPerformanceAllowanceParams
): Prisma.PerformanceAllowanceWhereInput {
  const and: Prisma.PerformanceAllowanceWhereInput[] = [];

  if (params.mode) and.push({ mode: params.mode });
  if (params.staffId) and.push({ staffId: params.staffId });
  if (params.departmentId) and.push({ departmentId: params.departmentId });
  if (params.designationId) and.push({ designationId: params.designationId });

  if (params.effectiveDate) {
    const day = startOfDay(new Date(params.effectiveDate));
    and.push({
      effectiveFrom: { lte: day },
      effectiveTo: { gte: day }
    });
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

async function resolveStaffSnapshot(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      code: true,
      name: true,
      employmentDetails: true
    }
  });
  if (!staff) return null;

  const employment = staff.employmentDetails?.employment;
  const departmentId = employment?.department ?? '';
  const designationId = employment?.staffDesignation ?? '';

  const [departmentRow, designationRow] = await Promise.all([
    departmentId
      ? prisma.department.findUnique({
          where: { id: departmentId },
          select: { name: true }
        })
      : Promise.resolve(null),
    designationId
      ? prisma.designation.findUnique({
          where: { id: designationId },
          select: { name: true }
        })
      : Promise.resolve(null)
  ]);

  return {
    staffCode: staff.code,
    staffName: staff.name,
    departmentId,
    department:
      departmentRow?.name ||
      labelFromOptions(DEPARTMENT_OPTIONS, departmentId),
    designationId,
    designation:
      designationRow?.name ||
      labelFromOptions(STAFF_DESIGNATION_OPTIONS, designationId)
  };
}

async function findOverlaps(input: {
  staffId: string;
  mode: PerformanceAllowanceMode;
  effectiveFrom: Date;
  effectiveTo: Date;
  excludeId?: string;
}): Promise<{ id: string; code: string }[]> {
  const candidates = await prisma.performanceAllowance.findMany({
    where: {
      staffId: input.staffId,
      mode: input.mode,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {})
    },
    select: {
      id: true,
      code: true,
      effectiveFrom: true,
      effectiveTo: true
    }
  });

  return candidates
    .filter((row) =>
      rangesOverlap(
        input.effectiveFrom,
        input.effectiveTo,
        row.effectiveFrom,
        row.effectiveTo
      )
    )
    .map((row) => ({ id: row.id, code: row.code }));
}

function pagination(params: GetPerformanceAllowanceParams) {
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
      Number(params.limit) || Number.parseInt(defaultPerPage, 10) || 10
    )
  );
  return { pageNumber, pageSize, skip: (pageNumber - 1) * pageSize };
}

export async function getPerformanceAllowanceList(
  params: GetPerformanceAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: PerformanceAllowanceRecord[];
  total?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const { pageSize, skip } = pagination(params);

    const [total, rows] = await Promise.all([
      prisma.performanceAllowance.count({ where }),
      prisma.performanceAllowance.findMany({
        where,
        select: recordSelect,
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
    console.error('getPerformanceAllowanceList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch performance allowances' }
    };
  }
}

export async function getPerformanceAllowanceById(id: string): Promise<{
  success: boolean;
  data?: PerformanceAllowanceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid allowance ID' } };
    }
    const record = await prisma.performanceAllowance.findUnique({
      where: { id },
      select: recordSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Performance allowance not found' } };
    }
    const [withUsers] = await resolveAuthUsers([record]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('getPerformanceAllowanceById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get performance allowance' }
    };
  }
}

export async function getPerformanceAllowanceSummary(
  params: GetPerformanceAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: PerformanceAllowanceSummary;
  error?: { message?: string };
}> {
  try {
    const today = startOfDay(new Date());
    const where: Prisma.PerformanceAllowanceWhereInput = {
      AND: [
        buildWhere({ ...params, page: undefined, limit: undefined }),
        {
          effectiveFrom: { lte: today },
          effectiveTo: { gte: today }
        }
      ]
    };

    const rows = await prisma.performanceAllowance.findMany({
      where,
      select: { staffId: true, value: true, mode: true }
    });

    const staffIds = new Set(rows.map((row) => row.staffId));
    const averageMetric =
      rows.length === 0
        ? 0
        : rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
    const totalMonthlyValue =
      params.mode === 'fixed'
        ? rows.reduce((sum, row) => sum + row.value, 0)
        : 0;

    return {
      success: true,
      data: {
        staffOnAllowance: staffIds.size,
        averageMetric,
        totalMonthlyValue
      }
    };
  } catch (error: any) {
    console.error('getPerformanceAllowanceSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load summary' }
    };
  }
}

export async function getPerformanceAllowanceExportRows(
  params: GetPerformanceAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: PerformanceAllowanceRecord[];
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const rows = await prisma.performanceAllowance.findMany({
      where,
      select: recordSelect,
      orderBy: [{ staffName: 'asc' }, { effectiveFrom: 'desc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    return { success: true, data: withUsers.map(mapRecord) };
  } catch (error: any) {
    console.error('getPerformanceAllowanceExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export performance allowances' }
    };
  }
}

export async function createPerformanceAllowance(
  payload: PerformanceAllowancePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: PerformanceAllowanceRecord;
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

    if (parsed.data.effectiveTo < parsed.data.effectiveFrom) {
      return fieldError(
        'effectiveTo',
        'Effective to must be on or after effective from'
      );
    }

    if (parsed.data.mode === 'percentage' && parsed.data.value > 100) {
      return fieldError('value', 'Percentage cannot exceed 100');
    }

    const staffSnap = await resolveStaffSnapshot(parsed.data.staffId);
    if (!staffSnap) {
      return fieldError('staffId', 'Staff member not found');
    }

    const overlaps = await findOverlaps({
      staffId: parsed.data.staffId,
      mode: parsed.data.mode,
      effectiveFrom: parsed.data.effectiveFrom,
      effectiveTo: parsed.data.effectiveTo
    });
    if (overlaps.length) {
      return {
        success: false,
        error: {
          message: `Overlapping ${parsed.data.mode} allowance exists (${overlaps[0].code}). Adjust dates or remove the existing record.`,
          issues: {
            effectiveFrom: [
              'Date range overlaps an existing performance allowance for this staff and mode'
            ]
          }
        }
      };
    }

    const generated = await generateRecordCode(
      PERFORMANCE_ALLOWANCE_CODE_PREFIX
    );
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate performance allowance code' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.performanceAllowance.create({
      data: {
        code: generated.code,
        staffId: parsed.data.staffId,
        mode: parsed.data.mode,
        value: parsed.data.value,
        effectiveFrom: parsed.data.effectiveFrom,
        effectiveTo: parsed.data.effectiveTo,
        ...staffSnap,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: recordSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('createPerformanceAllowance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create performance allowance' }
    };
  }
}

export async function updatePerformanceAllowance(
  id: string,
  payload: PerformanceAllowancePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: PerformanceAllowanceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid allowance ID' } };
    }

    const existing = await prisma.performanceAllowance.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return {
        success: false,
        error: { message: 'Performance allowance not found' }
      };
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

    if (parsed.data.effectiveTo < parsed.data.effectiveFrom) {
      return fieldError(
        'effectiveTo',
        'Effective to must be on or after effective from'
      );
    }

    if (parsed.data.mode === 'percentage' && parsed.data.value > 100) {
      return fieldError('value', 'Percentage cannot exceed 100');
    }

    const staffSnap = await resolveStaffSnapshot(parsed.data.staffId);
    if (!staffSnap) {
      return fieldError('staffId', 'Staff member not found');
    }

    const overlaps = await findOverlaps({
      staffId: parsed.data.staffId,
      mode: parsed.data.mode,
      effectiveFrom: parsed.data.effectiveFrom,
      effectiveTo: parsed.data.effectiveTo,
      excludeId: id
    });
    if (overlaps.length) {
      return {
        success: false,
        error: {
          message: `Overlapping ${parsed.data.mode} allowance exists (${overlaps[0].code}).`,
          issues: {
            effectiveFrom: [
              'Date range overlaps an existing performance allowance for this staff and mode'
            ]
          }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.performanceAllowance.update({
      where: { id },
      data: {
        staffId: parsed.data.staffId,
        mode: parsed.data.mode,
        value: parsed.data.value,
        effectiveFrom: parsed.data.effectiveFrom,
        effectiveTo: parsed.data.effectiveTo,
        ...staffSnap,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: recordSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('updatePerformanceAllowance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update performance allowance' }
    };
  }
}

export async function deletePerformanceAllowance(id: string): Promise<{
  success: boolean;
  data?: { deleted: boolean };
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid allowance ID' } };
    }
    await prisma.performanceAllowance.delete({ where: { id } });
    return { success: true, data: { deleted: true } };
  } catch (error: any) {
    console.error('deletePerformanceAllowance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete performance allowance' }
    };
  }
}
