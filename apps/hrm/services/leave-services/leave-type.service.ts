'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  LEAVE_TYPE_CODE_PREFIX,
  type GetLeaveTypesParams,
  type GetLeaveTypesReturn,
  type LeaveTypeOption,
  type LeaveTypePayload,
  type LeaveTypeRecord,
  type LieuLeaveTypeSummary
} from '@/types/leave';

const optionalDayAmount = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  });

const leaveTypePayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters'),
  description: z
    .string()
    .max(500, 'Must be less than 500 characters')
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value == null ? '' : String(value).trim();
      return trimmed ? trimmed : null;
    }),
  isPaid: z.boolean(),
  requiresApproval: z.boolean(),
  allowHalfDay: z.boolean(),
  isLieuLeave: z.boolean().optional().default(false),
  carryForwardAllowed: z.boolean(),
  maxDaysPerYear: optionalDayAmount,
  maxCarryForwardDays: optionalDayAmount,
  status: z.coerce.number().int().refine((value) => value === 0 || value === 1, {
    message: 'Status must be Published or Unpublished'
  })
});

const leaveTypeUpdatePayloadSchema = leaveTypePayloadSchema.partial().extend({
  id: z.string().min(1, 'Leave type ID is required'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .optional()
});

function parseYesNoFilter(value?: string): boolean | undefined {
  if (!value || value === '__all__') return undefined;
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}

function buildLeaveTypeWhere(
  params: GetLeaveTypesParams
): Prisma.LeaveTypeWhereInput {
  const where: Prisma.LeaveTypeWhereInput = {};
  const and: Prisma.LeaveTypeWhereInput[] = [];

  const keyword = params.keyword?.trim();
  if (keyword) {
    and.push({
      OR: [
        { name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        {
          description: { contains: keyword, mode: Prisma.QueryMode.insensitive }
        }
      ]
    });
  }

  if (params.status && params.status !== '__all__') {
    const status = Number.parseInt(params.status, 10);
    if (status === 0 || status === 1) {
      where.status = status;
    }
  }

  const isPaid = parseYesNoFilter(params.isPaid);
  if (isPaid !== undefined) where.isPaid = isPaid;

  const requiresApproval = parseYesNoFilter(params.requiresApproval);
  if (requiresApproval !== undefined) where.requiresApproval = requiresApproval;

  const allowHalfDay = parseYesNoFilter(params.allowHalfDay);
  if (allowHalfDay !== undefined) where.allowHalfDay = allowHalfDay;

  const isLieuLeave = parseYesNoFilter(params.isLieuLeave);
  if (isLieuLeave !== undefined) where.isLieuLeave = isLieuLeave;

  if (and.length) {
    where.AND = and;
  }

  return where;
}

/** At most one Leave Type may have isLieuLeave (any status). */
async function assertSingleLieuType(params: {
  isLieuLeave: boolean;
  excludeId?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!params.isLieuLeave) {
    return { ok: true };
  }

  const other = await prisma.leaveType.findFirst({
    where: {
      isLieuLeave: true,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {})
    },
    select: { id: true, code: true, name: true }
  });

  if (other) {
    return {
      ok: false,
      message: `Only one Lieu leave type is allowed. Edit ${other.code} — ${other.name} instead.`
    };
  }

  return { ok: true };
}

/** Locked Lieu policy: paid, no half-day, no CF, no max days/year. */
function normalizeLieuLeaveTypePayload<T extends Partial<{
  isPaid: boolean;
  allowHalfDay: boolean;
  carryForwardAllowed: boolean;
  maxDaysPerYear: number | null;
  maxCarryForwardDays: number | null;
  isLieuLeave: boolean;
}>>(data: T): T {
  if (!data.isLieuLeave) return data;
  return {
    ...data,
    isPaid: true,
    allowHalfDay: false,
    carryForwardAllowed: false,
    maxDaysPerYear: null,
    maxCarryForwardDays: null
  };
}

export async function getLieuLeaveType(): Promise<{
  success: boolean;
  data?: LieuLeaveTypeSummary | null;
  error?: { message?: string };
}> {
  try {
    const record = await prisma.leaveType.findFirst({
      where: { isLieuLeave: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true, name: true, status: true }
    });
    return { success: true, data: record };
  } catch (error: any) {
    console.error('getLieuLeaveType error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load Lieu leave type' }
    };
  }
}

export async function getLeaveTypes(params: GetLeaveTypesParams): Promise<{
  success: boolean;
  data?: { records: any[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const pageNumber = Math.max(
      1,
      Number.parseInt(params.page ?? process.env.DEFAULT_PAGE ?? '0', 10) || 1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number.parseInt(params.limit ?? defaultPerPage, 10) ||
          Number.parseInt(defaultPerPage, 10) ||
          10
      )
    );
    const skip = (pageNumber - 1) * pageSize;
    const where = buildLeaveTypeWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.leaveType.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.leaveType.count({ where })
    ]);

    const recordsWithUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: { records: recordsWithUsers, totalRecords },
      message: 'Leave types fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveTypes error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch leave types' }
    };
  }
}

export async function getLeaveTypesForExport({
  keyword = '',
  status,
  isPaid,
  requiresApproval,
  allowHalfDay
}: {
  keyword?: string;
  status?: string;
  isPaid?: string;
  requiresApproval?: string;
  allowHalfDay?: string;
}): Promise<GetLeaveTypesReturn> {
  try {
    const where = buildLeaveTypeWhere({
      keyword,
      status,
      isPaid,
      requiresApproval,
      allowHalfDay
    });

    const records = await prisma.leaveType.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const recordsWithUsers = await resolveAuthUsers(records);

    return {
      data: recordsWithUsers as LeaveTypeRecord[],
      totalRecords: recordsWithUsers.length
    };
  } catch (error) {
    console.error('getLeaveTypesForExport error', error);
    throw new Error('Error getting data');
  }
}

export async function getLeaveTypeById(id: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid leave type ID' } };
    }

    const leaveType = await prisma.leaveType.findUnique({ where: { id } });
    if (!leaveType) {
      return { success: false, error: { message: 'Leave type not found' } };
    }

    const [record] = await resolveAuthUsers([leaveType]);
    return {
      success: true,
      data: record,
      message: 'Leave type fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveTypeById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get leave type' }
    };
  }
}

export async function createLeaveType(
  payload: LeaveTypePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = leaveTypePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const auditUser = toAuditUser(user);
    const data = normalizeLieuLeaveTypePayload({
      ...parsed.data,
      isLieuLeave: Boolean(parsed.data.isLieuLeave)
    });
    const isLieuLeave = Boolean(data.isLieuLeave);

    const lieuGuard = await assertSingleLieuType({ isLieuLeave });
    if (!lieuGuard.ok) {
      return {
        success: false,
        error: {
          message: lieuGuard.message,
          issues: { isLieuLeave: [lieuGuard.message] }
        }
      };
    }

    const generated = await generateRecordCode(LEAVE_TYPE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate leave type code. Please try again.'
        }
      };
    }

    const carryForwardAllowed = Boolean(data.carryForwardAllowed);
    // Policy: CF off → maxCarryForwardDays is N/A (null), not 0.
    const maxCarryForwardDays = carryForwardAllowed
      ? (data.maxCarryForwardDays ?? null)
      : null;

    const leaveType = await prisma.leaveType.create({
      data: {
        code: generated.code,
        name: data.name,
        description: data.description,
        isPaid: data.isPaid,
        requiresApproval: data.requiresApproval,
        allowHalfDay: data.allowHalfDay,
        isLieuLeave,
        carryForwardAllowed,
        maxDaysPerYear: data.maxDaysPerYear ?? null,
        maxCarryForwardDays,
        status: data.status,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    return {
      success: true,
      data: leaveType,
      message: 'Leave type created successfully'
    };
  } catch (error: any) {
    console.error('createLeaveType error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { code: ['Leave type code already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create leave type' }
    };
  }
}

export async function updateLeaveType(
  id: string,
  payload: Partial<LeaveTypePayload>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = leaveTypeUpdatePayloadSchema.safeParse({ ...payload, id });
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
    const auditUser = toAuditUser(user);
    const existing = await prisma.leaveType.findUnique({
      where: { id },
      select: {
        id: true,
        isLieuLeave: true,
        status: true,
        carryForwardAllowed: true
      }
    });

    if (!existing) {
      return { success: false, error: { message: 'Leave type not found' } };
    }

    const nextIsLieu =
      data.isLieuLeave !== undefined
        ? Boolean(data.isLieuLeave)
        : Boolean(existing.isLieuLeave);

    // Normal edits cannot flip a row onto Lieu — use Add Lieu path only.
    if (nextIsLieu && !existing.isLieuLeave) {
      return {
        success: false,
        error: {
          message:
            'Cannot convert a normal leave type to Lieu. Use Add Lieu leave type.',
          issues: {
            isLieuLeave: [
              'Cannot convert a normal leave type to Lieu. Use Add Lieu leave type.'
            ]
          }
        }
      };
    }

    // Lieu flag cannot be cleared from the normal/Lieu edit UI (no switch).
    // Mis-tagged rows (e.g. Annual with Lieu=Yes) must be fixed via a dedicated
    // cleanup if needed; prefer delete when unused, then Add Lieu.

    const lieuGuard = await assertSingleLieuType({
      isLieuLeave: nextIsLieu,
      excludeId: id
    });
    if (!lieuGuard.ok) {
      return {
        success: false,
        error: {
          message: lieuGuard.message,
          issues: { isLieuLeave: [lieuGuard.message] }
        }
      };
    }

    const nextCarryForwardAllowed = nextIsLieu
      ? false
      : data.carryForwardAllowed !== undefined
        ? Boolean(data.carryForwardAllowed)
        : existing.carryForwardAllowed;

    const maxCarryForwardUpdate = nextIsLieu
      ? { maxCarryForwardDays: null as number | null }
      : !nextCarryForwardAllowed
        ? { maxCarryForwardDays: null as number | null }
        : data.maxCarryForwardDays !== undefined
          ? { maxCarryForwardDays: data.maxCarryForwardDays }
          : {};

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description
        }),
        ...(nextIsLieu
          ? {
              isPaid: true,
              allowHalfDay: false,
              carryForwardAllowed: false,
              maxDaysPerYear: null,
              isLieuLeave: true
            }
          : {
              ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
              ...(data.allowHalfDay !== undefined && {
                allowHalfDay: data.allowHalfDay
              }),
              ...(data.carryForwardAllowed !== undefined && {
                carryForwardAllowed: nextCarryForwardAllowed
              }),
              ...(data.maxDaysPerYear !== undefined && {
                maxDaysPerYear: data.maxDaysPerYear
              }),
              ...(data.isLieuLeave !== undefined && { isLieuLeave: false })
            }),
        ...(data.requiresApproval !== undefined && {
          requiresApproval: data.requiresApproval
        }),
        ...maxCarryForwardUpdate,
        ...(data.status !== undefined && { status: data.status }),
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    return {
      success: true,
      data: leaveType,
      message: 'Leave type updated successfully'
    };
  } catch (error: any) {
    console.error('updateLeaveType error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { code: ['Leave type code already exists'] }
        }
      };
    }
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Leave type not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update leave type' }
    };
  }
}

async function assertLeaveTypeDeletable(id: string): Promise<string | null> {
  const [entitlementCount, applicationCount, grantCount] = await Promise.all([
    prisma.leaveEntitlement.count({ where: { leaveTypeId: id } }),
    prisma.leaveApplication.count({ where: { leaveTypeId: id } }),
    prisma.lieuLeaveGrant.count({ where: { leaveTypeId: id } })
  ]);

  if (entitlementCount > 0 || applicationCount > 0 || grantCount > 0) {
    return 'Cannot delete a leave type that is used by entitlements, applications, or lieu grants. Unpublish it instead.';
  }

  return null;
}

export async function deleteLeaveType(id: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const blocked = await assertLeaveTypeDeletable(id);
    if (blocked) {
      return { success: false, error: { message: blocked } };
    }

    await prisma.leaveType.delete({ where: { id } });
    return { success: true, message: 'Leave type deleted successfully' };
  } catch (error: any) {
    console.error('deleteLeaveType error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Leave type not found' } };
    }
    if (error.code === 'P2014' || error.code === 'P2003') {
      return {
        success: false,
        error: {
          message:
            'Cannot delete a leave type that is still referenced by related records. Unpublish it instead.'
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to delete leave type' }
    };
  }
}

export async function deleteLeaveTypes(ids: string[]): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!ids?.length) {
      return { success: false, error: { message: 'No leave type IDs provided' } };
    }

    const [entitlementCount, applicationCount, grantCount] = await Promise.all([
      prisma.leaveEntitlement.count({ where: { leaveTypeId: { in: ids } } }),
      prisma.leaveApplication.count({ where: { leaveTypeId: { in: ids } } }),
      prisma.lieuLeaveGrant.count({ where: { leaveTypeId: { in: ids } } })
    ]);

    if (entitlementCount > 0 || applicationCount > 0 || grantCount > 0) {
      return {
        success: false,
        error: {
          message:
            'Cannot delete leave types that are used by entitlements, applications, or lieu grants. Unpublish them instead.'
        }
      };
    }

    const result = await prisma.leaveType.deleteMany({
      where: { id: { in: ids } }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: { message: 'No leave types found to delete' }
      };
    }

    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} leave type(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('deleteLeaveTypes error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete leave types' }
    };
  }
}

export async function getLeaveTypeOptions(): Promise<{
  success: boolean;
  data?: LeaveTypeOption[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const records = await prisma.leaveType.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      take:
        Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100,
      select: {
        id: true,
        name: true,
        code: true,
        allowHalfDay: true,
        isLieuLeave: true,
        carryForwardAllowed: true,
        maxDaysPerYear: true,
        maxCarryForwardDays: true
      }
    });

    return {
      success: true,
      data: records.map((record) => ({
        id: record.id,
        name: record.name,
        code: record.code,
        allowHalfDay: Boolean(record.allowHalfDay),
        isLieuLeave: Boolean(record.isLieuLeave),
        carryForwardAllowed: Boolean(record.carryForwardAllowed),
        maxDaysPerYear:
          record.maxDaysPerYear == null ? null : Number(record.maxDaysPerYear),
        maxCarryForwardDays:
          record.maxCarryForwardDays == null
            ? null
            : Number(record.maxCarryForwardDays)
      })),
      message: 'Leave type options fetched'
    };
  } catch (error: any) {
    console.error('getLeaveTypeOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch leave type options' }
    };
  }
}
