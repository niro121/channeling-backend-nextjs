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
  type LeaveTypePayload
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
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    }),
  isPaid: z.boolean(),
  requiresApproval: z.boolean(),
  allowHalfDay: z.boolean(),
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

  if (and.length) {
    where.AND = and;
  }

  return where;
}

export async function getLeaveTypes(params: GetLeaveTypesParams): Promise<{
  success: boolean;
  data?: { records: any[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const pageNumber = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(params.limit ?? '10', 10) || 10)
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

export async function getLeaveTypesForExport(
  params: Omit<GetLeaveTypesParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const where = buildLeaveTypeWhere(params);
    const records = await prisma.leaveType.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000
    });
    return {
      success: true,
      data: records,
      message: 'Leave types export fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveTypesForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export leave types' }
    };
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

    const data = parsed.data;
    const auditUser = toAuditUser(user);

    const generated = await generateRecordCode(LEAVE_TYPE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate leave type code. Please try again.'
        }
      };
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        code: generated.code,
        name: data.name,
        description: data.description,
        isPaid: data.isPaid,
        requiresApproval: data.requiresApproval,
        allowHalfDay: data.allowHalfDay,
        carryForwardAllowed: data.carryForwardAllowed,
        maxDaysPerYear: data.maxDaysPerYear,
        maxCarryForwardDays: data.maxCarryForwardDays,
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
      select: { id: true }
    });

    if (!existing) {
      return { success: false, error: { message: 'Leave type not found' } };
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description
        }),
        ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
        ...(data.requiresApproval !== undefined && {
          requiresApproval: data.requiresApproval
        }),
        ...(data.allowHalfDay !== undefined && {
          allowHalfDay: data.allowHalfDay
        }),
        ...(data.carryForwardAllowed !== undefined && {
          carryForwardAllowed: data.carryForwardAllowed
        }),
        ...(data.maxDaysPerYear !== undefined && {
          maxDaysPerYear: data.maxDaysPerYear
        }),
        ...(data.maxCarryForwardDays !== undefined && {
          maxCarryForwardDays: data.maxCarryForwardDays
        }),
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
  const [entitlementCount, applicationCount] = await Promise.all([
    prisma.leaveEntitlement.count({ where: { leaveTypeId: id } }),
    prisma.leaveApplication.count({ where: { leaveTypeId: id } })
  ]);

  if (entitlementCount > 0 || applicationCount > 0) {
    return 'Cannot delete a leave type that is used by entitlements or applications.';
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

    const [entitlementCount, applicationCount] = await Promise.all([
      prisma.leaveEntitlement.count({ where: { leaveTypeId: { in: ids } } }),
      prisma.leaveApplication.count({ where: { leaveTypeId: { in: ids } } })
    ]);

    if (entitlementCount > 0 || applicationCount > 0) {
      return {
        success: false,
        error: {
          message:
            'Cannot delete leave types that are used by entitlements or applications.'
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

export type LeaveTypeOption = { id: string; name: string; code: string };

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
      take: 500,
      select: { id: true, name: true, code: true }
    });

    return {
      success: true,
      data: records.map((record) => ({
        id: record.id,
        name: record.name,
        code: record.code
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
