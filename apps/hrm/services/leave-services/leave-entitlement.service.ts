'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  computeEntitlementRemaining,
  LEAVE_ENTITLEMENT_STATUSES,
  type GetLeaveEntitlementsParams,
  type LeaveEntitlementBalanceSummary,
  type LeaveEntitlementPayload
} from '@/types/leave';

const dayAmountSchema = z.coerce
  .number()
  .finite()
  .min(0, 'Must be 0 or greater');

const leaveEntitlementPayloadSchema = z
  .object({
    staffId: z.string().min(1, 'Employee is required'),
    leaveTypeId: z.string().min(1, 'Leave type is required'),
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
    entitled: dayAmountSchema,
    carryForward: dayAmountSchema.optional().default(0),
    status: z
      .enum(LEAVE_ENTITLEMENT_STATUSES)
      .optional()
      .default('active')
  })
  .refine((data) => data.toDate >= data.fromDate, {
    message: 'To date must be on or after from date',
    path: ['toDate']
  });

const leaveEntitlementUpdatePayloadSchema = z
  .object({
    id: z.string().min(1, 'Entitlement ID is required'),
    staffId: z.string().min(1, 'Employee is required').optional(),
    leaveTypeId: z.string().min(1, 'Leave type is required').optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    entitled: dayAmountSchema.optional(),
    carryForward: dayAmountSchema.optional(),
    status: z.enum(LEAVE_ENTITLEMENT_STATUSES).optional()
  })
  .superRefine((data, ctx) => {
    if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'To date must be on or after from date',
        path: ['toDate']
      });
    }
  });

function parseOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function buildEntitlementWhere(
  params: GetLeaveEntitlementsParams
): Prisma.LeaveEntitlementWhereInput {
  const where: Prisma.LeaveEntitlementWhereInput = {};

  if (params.staffId) {
    where.staffId = params.staffId;
  }

  if (params.leaveTypeId && params.leaveTypeId !== '__all__') {
    where.leaveTypeId = params.leaveTypeId;
  }

  // departmentId reserved for when department master exists

  const fromDate = parseOptionalDate(params.fromDate);
  const toDate = parseOptionalDate(params.toDate);

  if (fromDate || toDate) {
    // Overlap: entitlement.fromDate <= filter.to && entitlement.toDate >= filter.from
    where.AND = [
      ...(fromDate ? [{ toDate: { gte: fromDate } }] : []),
      ...(toDate ? [{ fromDate: { lte: toDate } }] : [])
    ];
  }

  return where;
}

function mapEntitlementRecord(record: any) {
  return {
    ...record,
    leaveTypeName: record.leaveType?.name ?? '',
    leaveTypeCode: record.leaveType?.code ?? '',
    staffName: record.staff?.name ?? '',
    staffCode: record.staff?.code ?? ''
  };
}

export async function getLeaveEntitlements(
  params: GetLeaveEntitlementsParams
): Promise<{
  success: boolean;
  data?: { records: any[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const defaultPage = process.env.DEFAULT_PAGE ?? '0';
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize = Number.parseInt(
      process.env.DEFAULT_PAGE_SIZE ?? '100',
      10
    ) || 100;
    const pageNumber = Math.max(
      1,
      Number.parseInt(params.page ?? defaultPage, 10) || 1
    );
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
    const where = buildEntitlementWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.leaveEntitlement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ fromDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          leaveType: { select: { id: true, name: true, code: true } },
          staff: { select: { id: true, name: true, code: true } }
        }
      }),
      prisma.leaveEntitlement.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: withUsers.map(mapEntitlementRecord),
        totalRecords
      },
      message: 'Leave entitlements fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveEntitlements error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch leave entitlements' }
    };
  }
}

export async function getLeaveEntitlementsForExport(
  params: Omit<GetLeaveEntitlementsParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const where = buildEntitlementWhere(params);
    const exportLimit =
      Number.parseInt(process.env.EXPORT_LIMIT ?? '1000', 10) || 1000;
    const records = await prisma.leaveEntitlement.findMany({
      where,
      orderBy: [{ fromDate: 'desc' }, { createdAt: 'desc' }],
      take: exportLimit,
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        staff: { select: { id: true, name: true, code: true } }
      }
    });
    return {
      success: true,
      data: records.map(mapEntitlementRecord),
      message: 'Leave entitlements export fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveEntitlementsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export leave entitlements' }
    };
  }
}

export async function getLeaveEntitlementById(id: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid entitlement ID' } };
    }

    const record = await prisma.leaveEntitlement.findUnique({
      where: { id },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    if (!record) {
      return { success: false, error: { message: 'Leave entitlement not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    return {
      success: true,
      data: mapEntitlementRecord(withUsers),
      message: 'Leave entitlement fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveEntitlementById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get leave entitlement' }
    };
  }
}

export async function getLeaveEntitlementBalance(
  staffId: string
): Promise<{
  success: boolean;
  data?: LeaveEntitlementBalanceSummary;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!staffId) {
      return {
        success: true,
        data: {
          totalEntitlement: 0,
          used: 0,
          remaining: 0,
          carryForward: 0,
          utilisations: []
        }
      };
    }

    const records = await prisma.leaveEntitlement.findMany({
      where: { staffId, status: { in: ['active', 'pending'] } },
      include: {
        leaveType: { select: { name: true } }
      }
    });

    const totalEntitlement = records.reduce((sum, row) => sum + row.entitled, 0);
    const used = records.reduce((sum, row) => sum + row.used, 0);
    const remaining = records.reduce((sum, row) => sum + row.remaining, 0);
    const carryForward = records.reduce(
      (sum, row) => sum + row.carryForward,
      0
    );

    const utilisations = records
      .map((row) => {
        const base = row.entitled + row.carryForward;
        const percent =
          base > 0 ? Math.round((row.used / base) * 100) : 0;
        return {
          label: `${row.leaveType?.name ?? 'Leave'} Utilisation`,
          percent: Math.min(100, Math.max(0, percent))
        };
      })
      .slice(0, 6);

    return {
      success: true,
      data: {
        totalEntitlement,
        used,
        remaining,
        carryForward,
        utilisations
      }
    };
  } catch (error: any) {
    console.error('getLeaveEntitlementBalance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load leave balance' }
    };
  }
}

export async function createLeaveEntitlement(
  payload: LeaveEntitlementPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = leaveEntitlementPayloadSchema.safeParse(payload);
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

    const [staff, leaveType] = await Promise.all([
      prisma.staff.findUnique({ where: { id: data.staffId }, select: { id: true } }),
      prisma.leaveType.findUnique({
        where: { id: data.leaveTypeId },
        select: { id: true, status: true }
      })
    ]);

    if (!staff) {
      return {
        success: false,
        error: {
          message: 'Employee not found',
          issues: { staffId: ['Selected employee was not found'] }
        }
      };
    }

    if (!leaveType) {
      return {
        success: false,
        error: {
          message: 'Leave type not found',
          issues: { leaveTypeId: ['Selected leave type was not found'] }
        }
      };
    }

    const used = 0;
    const remaining = computeEntitlementRemaining(
      data.entitled,
      data.carryForward,
      used
    );

    const record = await prisma.leaveEntitlement.create({
      data: {
        staffId: data.staffId,
        leaveTypeId: data.leaveTypeId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        entitled: data.entitled,
        used,
        remaining,
        carryForward: data.carryForward,
        status: data.status,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    return {
      success: true,
      data: mapEntitlementRecord(record),
      message: 'Leave entitlement created successfully'
    };
  } catch (error: any) {
    console.error('createLeaveEntitlement error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message:
            'An entitlement already exists for this employee, leave type, and date range.'
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create leave entitlement' }
    };
  }
}

export async function updateLeaveEntitlement(
  id: string,
  payload: Partial<LeaveEntitlementPayload>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = leaveEntitlementUpdatePayloadSchema.safeParse({
      ...payload,
      id
    });
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
    const existing = await prisma.leaveEntitlement.findUnique({
      where: { id }
    });

    if (!existing) {
      return { success: false, error: { message: 'Leave entitlement not found' } };
    }

    const entitled = data.entitled ?? existing.entitled;
    const carryForward = data.carryForward ?? existing.carryForward;
    const used = existing.used;
    const remaining = computeEntitlementRemaining(entitled, carryForward, used);

    const fromDate = data.fromDate ?? existing.fromDate;
    const toDate = data.toDate ?? existing.toDate;
    if (toDate < fromDate) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { toDate: ['To date must be on or after from date'] }
        }
      };
    }

    const record = await prisma.leaveEntitlement.update({
      where: { id },
      data: {
        ...(data.staffId !== undefined && { staffId: data.staffId }),
        ...(data.leaveTypeId !== undefined && { leaveTypeId: data.leaveTypeId }),
        fromDate,
        toDate,
        entitled,
        carryForward,
        remaining,
        ...(data.status !== undefined && { status: data.status }),
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    return {
      success: true,
      data: mapEntitlementRecord(record),
      message: 'Leave entitlement updated successfully'
    };
  } catch (error: any) {
    console.error('updateLeaveEntitlement error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message:
            'An entitlement already exists for this employee, leave type, and date range.'
        }
      };
    }
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Leave entitlement not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update leave entitlement' }
    };
  }
}

export async function deleteLeaveEntitlement(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    await prisma.leaveEntitlement.delete({ where: { id } });
    return { success: true, message: 'Leave entitlement deleted successfully' };
  } catch (error: any) {
    console.error('deleteLeaveEntitlement error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Leave entitlement not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to delete leave entitlement' }
    };
  }
}
