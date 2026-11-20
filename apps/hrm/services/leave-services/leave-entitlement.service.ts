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
  type GetLeaveEntitlementsReturn,
  type LeaveEntitlementBalanceSummary,
  type LeaveEntitlementPayload,
  type LeaveEntitlementRecord
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

  const departmentId = params.departmentId?.trim();
  if (departmentId && departmentId !== '__all__') {
    where.staff = {
      is: {
        employmentDetails: {
          is: {
            employment: {
              is: {
                department: departmentId
              }
            }
          }
        }
      }
    };
  }

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

const OVERLAP_CONFLICT_MESSAGE =
  'An entitlement already exists for this employee, leave type, and overlapping date range.';

type LeaveTypePolicy = {
  id: string;
  status: number;
  maxDaysPerYear: number | null;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number | null;
};

/**
 * Caps from Leave Type:
 * - entitled ≤ maxDaysPerYear (when set)
 * - carryForward = 0 when CF not allowed
 * - carryForward ≤ maxCarryForwardDays (when CF allowed and max set)
 */
function applyLeaveTypeEntitlementCaps(input: {
  entitled: number;
  carryForward: number;
  leaveType: LeaveTypePolicy;
}):
  | { ok: true; entitled: number; carryForward: number }
  | { ok: false; message: string; issues: Record<string, string[]> } {
  const { entitled, leaveType } = input;
  let carryForward = input.carryForward;

  if (
    leaveType.maxDaysPerYear != null &&
    entitled > leaveType.maxDaysPerYear
  ) {
    const message = `Entitled days cannot exceed the leave type maximum (${leaveType.maxDaysPerYear}).`;
    return {
      ok: false,
      message,
      issues: { entitled: [message] }
    };
  }

  if (!leaveType.carryForwardAllowed) {
    if (carryForward > 0) {
      const message =
        'Carry forward is not allowed for this leave type. Set carry forward days to 0.';
      return {
        ok: false,
        message,
        issues: { carryForward: [message] }
      };
    }
    carryForward = 0;
  } else if (
    leaveType.maxCarryForwardDays != null &&
    carryForward > leaveType.maxCarryForwardDays
  ) {
    const message = `Carry forward days cannot exceed the leave type maximum (${leaveType.maxCarryForwardDays}).`;
    return {
      ok: false,
      message,
      issues: { carryForward: [message] }
    };
  }

  return { ok: true, entitled, carryForward };
}

async function findOverlappingLeaveEntitlement(params: {
  staffId: string;
  leaveTypeId: string;
  fromDate: Date;
  toDate: Date;
  excludeId?: string;
}) {
  return prisma.leaveEntitlement.findFirst({
    where: {
      staffId: params.staffId,
      leaveTypeId: params.leaveTypeId,
      fromDate: { lte: params.toDate },
      toDate: { gte: params.fromDate },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {})
    },
    select: {
      id: true,
      fromDate: true,
      toDate: true,
      status: true
    },
    orderBy: { fromDate: 'desc' }
  });
}

async function assertLeaveEntitlementDeletable(
  id: string
): Promise<string | null> {
  const entitlement = await prisma.leaveEntitlement.findUnique({
    where: { id },
    select: {
      id: true,
      staffId: true,
      leaveTypeId: true,
      fromDate: true,
      toDate: true
    }
  });
  if (!entitlement) {
    return 'Leave entitlement not found';
  }

  const [grantCount, applicationCount] = await Promise.all([
    prisma.lieuLeaveGrant.count({ where: { entitlementId: id } }),
    prisma.leaveApplication.count({
      where: {
        staffId: entitlement.staffId,
        leaveTypeId: entitlement.leaveTypeId,
        status: { in: ['pending', 'approved'] },
        fromDate: { lte: entitlement.toDate },
        toDate: { gte: entitlement.fromDate }
      }
    })
  ]);

  if (grantCount > 0) {
    return 'Cannot delete an entitlement that has lieu leave grants. Reverse those grants first.';
  }
  if (applicationCount > 0) {
    return 'Cannot delete an entitlement that is used by pending or approved leave applications.';
  }

  return null;
}

function mapEntitlementRecord(record: any) {
  return {
    ...record,
    leaveTypeName: record.leaveType?.name ?? '',
    leaveTypeCode: record.leaveType?.code ?? '',
    isLieuLeave: Boolean(record.leaveType?.isLieuLeave),
    staffName: record.staff?.name ?? '',
    staffCode: record.staff?.code ?? ''
  };
}

const LIEU_MANUAL_ENTITLEMENT_MESSAGE =
  'Lieu leave entitlement is managed by Public Holiday Grant Lieu — it cannot be created or edited here.';

function rejectManualLieuEntitlement(isLieuLeave: boolean) {
  if (!isLieuLeave) return null;
  return {
    success: false as const,
    error: {
      message: LIEU_MANUAL_ENTITLEMENT_MESSAGE,
      issues: { leaveTypeId: [LIEU_MANUAL_ENTITLEMENT_MESSAGE] }
    }
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
          leaveType: {
            select: { id: true, name: true, code: true, isLieuLeave: true }
          },
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

export async function getLeaveEntitlementsForExport({
  staffId,
  leaveTypeId,
  departmentId,
  fromDate,
  toDate
}: {
  staffId?: string;
  leaveTypeId?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<GetLeaveEntitlementsReturn> {
  try {
    const where = buildEntitlementWhere({
      staffId,
      leaveTypeId,
      departmentId,
      fromDate,
      toDate
    });

    const records = await prisma.leaveEntitlement.findMany({
      where,
      orderBy: [{ fromDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, isLieuLeave: true }
        },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    const recordsWithUsers = await resolveAuthUsers(records);
    const data = recordsWithUsers.map(
      mapEntitlementRecord
    ) as LeaveEntitlementRecord[];

    return {
      data,
      totalRecords: data.length
    };
  } catch (error) {
    console.error('getLeaveEntitlementsForExport error', error);
    throw new Error('Error getting data');
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
        leaveType: {
          select: { id: true, name: true, code: true, isLieuLeave: true }
        },
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
  staffId: string,
  range?: { fromDate?: Date | string | null; toDate?: Date | string | null }
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
          leaveTypes: [],
          utilisations: []
        }
      };
    }

    const fromDate = range?.fromDate ? new Date(range.fromDate) : null;
    const toDate = range?.toDate ? new Date(range.toDate) : null;
    const hasValidFrom =
      fromDate !== null && !Number.isNaN(fromDate.getTime());
    const hasValidTo = toDate !== null && !Number.isNaN(toDate.getTime());

    const records = await prisma.leaveEntitlement.findMany({
      where: {
        staffId,
        status: { in: ['active', 'pending'] },
        ...(hasValidFrom || hasValidTo
          ? {
              // Overlap: entitlement.fromDate <= range.to && entitlement.toDate >= range.from
              ...(hasValidTo ? { fromDate: { lte: toDate! } } : {}),
              ...(hasValidFrom ? { toDate: { gte: fromDate! } } : {})
            }
          : {})
      },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, isLieuLeave: true }
        }
      },
      orderBy: { fromDate: 'desc' }
    });

    // One row per leave type (latest overlapping entitlement period).
    const byLeaveType = new Map<string, (typeof records)[number]>();
    for (const row of records) {
      if (!byLeaveType.has(row.leaveTypeId)) {
        byLeaveType.set(row.leaveTypeId, row);
      }
    }
    const uniqueRecords = Array.from(byLeaveType.values());

    const totalEntitlement = uniqueRecords.reduce(
      (sum, row) => sum + row.entitled,
      0
    );
    const used = uniqueRecords.reduce((sum, row) => sum + row.used, 0);
    const remaining = uniqueRecords.reduce(
      (sum, row) => sum + row.remaining,
      0
    );
    const carryForward = uniqueRecords.reduce(
      (sum, row) => sum + row.carryForward,
      0
    );

    const leaveTypes = uniqueRecords.map((row) => ({
      leaveTypeId: row.leaveTypeId,
      leaveTypeName: row.leaveType?.name
        ? row.leaveType.code
          ? `${row.leaveType.code} — ${row.leaveType.name}`
          : row.leaveType.name
        : 'Leave',
      entitled: row.entitled,
      used: row.used,
      remaining: row.remaining,
      carryForward: row.carryForward
    }));

    const utilisations = leaveTypes
      .map((row) => {
        const base = row.entitled + row.carryForward;
        const percent =
          base > 0 ? Math.round((row.used / base) * 100) : 0;
        return {
          label: `${row.leaveTypeName} Utilisation`,
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
        leaveTypes,
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

    const [staff, leaveTypeRow] = await Promise.all([
      prisma.staff.findUnique({ where: { id: data.staffId }, select: { id: true } }),
      prisma.leaveType.findUnique({
        where: { id: data.leaveTypeId },
        select: {
          id: true,
          status: true,
          isLieuLeave: true,
          maxDaysPerYear: true,
          carryForwardAllowed: true,
          maxCarryForwardDays: true
        }
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

    if (!leaveTypeRow) {
      return {
        success: false,
        error: {
          message: 'Leave type not found',
          issues: { leaveTypeId: ['Selected leave type was not found'] }
        }
      };
    }

    const lieuBlocked = rejectManualLieuEntitlement(
      Boolean(leaveTypeRow.isLieuLeave)
    );
    if (lieuBlocked) return lieuBlocked;

    const leaveType: LeaveTypePolicy = {
      id: leaveTypeRow.id,
      status: leaveTypeRow.status,
      maxDaysPerYear:
        leaveTypeRow.maxDaysPerYear == null
          ? null
          : Number(leaveTypeRow.maxDaysPerYear),
      carryForwardAllowed: Boolean(leaveTypeRow.carryForwardAllowed),
      maxCarryForwardDays:
        leaveTypeRow.maxCarryForwardDays == null
          ? null
          : Number(leaveTypeRow.maxCarryForwardDays)
    };

    const caps = applyLeaveTypeEntitlementCaps({
      entitled: data.entitled,
      carryForward: data.carryForward,
      leaveType
    });
    if (!caps.ok) {
      return {
        success: false,
        error: { message: caps.message, issues: caps.issues }
      };
    }

    const overlapping = await findOverlappingLeaveEntitlement({
      staffId: data.staffId,
      leaveTypeId: data.leaveTypeId,
      fromDate: data.fromDate,
      toDate: data.toDate
    });
    if (overlapping) {
      return {
        success: false,
        error: {
          message: OVERLAP_CONFLICT_MESSAGE,
          issues: {
            fromDate: [OVERLAP_CONFLICT_MESSAGE],
            toDate: [OVERLAP_CONFLICT_MESSAGE]
          }
        }
      };
    }

    const used = 0;
    const remaining = computeEntitlementRemaining(
      caps.entitled,
      caps.carryForward,
      used
    );

    const record = await prisma.leaveEntitlement.create({
      data: {
        staffId: data.staffId,
        leaveTypeId: data.leaveTypeId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        entitled: caps.entitled,
        used,
        remaining,
        carryForward: caps.carryForward,
        status: data.status,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, isLieuLeave: true }
        },
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
          message: OVERLAP_CONFLICT_MESSAGE,
          issues: {
            fromDate: [OVERLAP_CONFLICT_MESSAGE],
            toDate: [OVERLAP_CONFLICT_MESSAGE]
          }
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

    const staffId = data.staffId ?? existing.staffId;
    const leaveTypeId = data.leaveTypeId ?? existing.leaveTypeId;

    const leaveTypeRow = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
      select: {
        id: true,
        status: true,
        isLieuLeave: true,
        maxDaysPerYear: true,
        carryForwardAllowed: true,
        maxCarryForwardDays: true
      }
    });
    if (!leaveTypeRow) {
      return {
        success: false,
        error: {
          message: 'Leave type not found',
          issues: { leaveTypeId: ['Selected leave type was not found'] }
        }
      };
    }

    const lieuBlocked = rejectManualLieuEntitlement(
      Boolean(leaveTypeRow.isLieuLeave)
    );
    if (lieuBlocked) return lieuBlocked;

    const leaveType: LeaveTypePolicy = {
      id: leaveTypeRow.id,
      status: leaveTypeRow.status,
      maxDaysPerYear:
        leaveTypeRow.maxDaysPerYear == null
          ? null
          : Number(leaveTypeRow.maxDaysPerYear),
      carryForwardAllowed: Boolean(leaveTypeRow.carryForwardAllowed),
      maxCarryForwardDays:
        leaveTypeRow.maxCarryForwardDays == null
          ? null
          : Number(leaveTypeRow.maxCarryForwardDays)
    };

    const caps = applyLeaveTypeEntitlementCaps({
      entitled: data.entitled ?? existing.entitled,
      carryForward: data.carryForward ?? existing.carryForward,
      leaveType
    });
    if (!caps.ok) {
      return {
        success: false,
        error: { message: caps.message, issues: caps.issues }
      };
    }

    const used = existing.used;
    const remaining = computeEntitlementRemaining(
      caps.entitled,
      caps.carryForward,
      used
    );

    const overlapping = await findOverlappingLeaveEntitlement({
      staffId,
      leaveTypeId,
      fromDate,
      toDate,
      excludeId: id
    });
    if (overlapping) {
      return {
        success: false,
        error: {
          message: OVERLAP_CONFLICT_MESSAGE,
          issues: {
            fromDate: [OVERLAP_CONFLICT_MESSAGE],
            toDate: [OVERLAP_CONFLICT_MESSAGE]
          }
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
        entitled: caps.entitled,
        carryForward: caps.carryForward,
        remaining,
        ...(data.status !== undefined && { status: data.status }),
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, isLieuLeave: true }
        },
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
          message: OVERLAP_CONFLICT_MESSAGE,
          issues: {
            fromDate: [OVERLAP_CONFLICT_MESSAGE],
            toDate: [OVERLAP_CONFLICT_MESSAGE]
          }
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
    const blocked = await assertLeaveEntitlementDeletable(id);
    if (blocked) {
      return { success: false, error: { message: blocked } };
    }

    await prisma.leaveEntitlement.delete({ where: { id } });
    return { success: true, message: 'Leave entitlement deleted successfully' };
  } catch (error: any) {
    console.error('deleteLeaveEntitlement error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Leave entitlement not found' } };
    }
    if (error.code === 'P2014' || error.code === 'P2003') {
      return {
        success: false,
        error: {
          message:
            'Cannot delete an entitlement that is still referenced by related records.'
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to delete leave entitlement' }
    };
  }
}
