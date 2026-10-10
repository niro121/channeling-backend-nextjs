'use server';

import { z } from 'zod';
import { authPrisma } from '@archmage/db-auth';
import type { Permissions } from '@archmage/shared';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  computeLeaveApplicationDays,
  isHalfDaySession,
  isSameLocalDay
} from '@/lib/helpers/leave-application-days.helper';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { hasPermission } from '@/lib/permissions';
import { userTypes } from '@/lib/roles';
import { formatDate } from '@/lib/utils/date';
import {
  computeEntitlementRemaining,
  LEAVE_HALF_DAY_SESSIONS,
  type GetLeaveApplicationsParams,
  type LeaveApplicationPayload,
  type LeaveApplicationShiftRow
} from '@/types/leave';

const leaveApplicationPayloadSchema = z
  .object({
    staffId: z.string().min(1, 'Staff is required'),
    leaveTypeId: z.string().min(1, 'Leave type is required'),
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
    requestedDate: z.coerce.date().nullable().optional(),
    approverId: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
    outWithCancel: z.boolean().optional().default(false),
    isHalfDay: z.boolean().optional().default(false),
    halfDaySession: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.enum(LEAVE_HALF_DAY_SESSIONS).nullable().optional()
    ),
    lieuShiftId: z.string().nullable().optional(),
    lieuShiftLabel: z.string().nullable().optional(),
    entitleSnapshot: z.coerce.number().finite().nullable().optional(),
    utilizedSnapshot: z.coerce.number().finite().nullable().optional(),
    balanceSnapshot: z.coerce.number().finite().nullable().optional(),
    shifts: z
      .array(
        z.object({
          shiftLabel: z.string().min(1),
          from: z.coerce.date(),
          to: z.coerce.date(),
          shiftDate: z.coerce.date().nullable().optional()
        })
      )
      .optional()
  })
  .superRefine((data, ctx) => {
    if (data.isHalfDay) {
      if (!isHalfDaySession(data.halfDaySession)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Select Morning or Afternoon for half-day leave',
          path: ['halfDaySession']
        });
      }
      if (!isSameLocalDay(data.fromDate, data.toDate)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Half-day leave must be a single date',
          path: ['toDate']
        });
      }
      return;
    }

    if (data.toDate < data.fromDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'To date must be on or after from date',
        path: ['toDate']
      });
    }
  });

const leaveApplicationUpdatePayloadSchema = leaveApplicationPayloadSchema;

function parseOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapShiftsForWrite(shifts?: LeaveApplicationShiftRow[]) {
  if (!shifts?.length) return [];
  return shifts.map((shift) => ({
    shiftLabel: shift.shiftLabel,
    from: new Date(shift.from),
    to: new Date(shift.to),
    ...(shift.shiftDate ? { shiftDate: new Date(shift.shiftDate) } : {})
  }));
}

function deriveShiftDate(record: {
  shifts?: { shiftDate?: Date | null }[] | null;
  fromDate: Date;
}): string {
  const firstShiftDate = record.shifts?.find((s) => s.shiftDate)?.shiftDate;
  return formatDate(firstShiftDate ?? record.fromDate);
}

function mapApplicationRecord(record: any) {
  const days = Number(record.days ?? 0);
  const halfDaySession =
    record.halfDaySession === 'AM' || record.halfDaySession === 'PM'
      ? record.halfDaySession
      : null;
  return {
    ...record,
    leaveType: record.leaveType?.name ?? record.leaveTypeName ?? '',
    leaveTypeId: record.leaveTypeId,
    allowHalfDay: Boolean(record.leaveType?.allowHalfDay),
    staffName: record.staff?.name ?? record.staffName ?? '',
    staffCode: record.staff?.code ?? record.staffCode ?? '',
    fromDate: formatDate(record.fromDate),
    toDate: formatDate(record.toDate),
    requestedDate: record.requestedDate
      ? formatDate(record.requestedDate)
      : null,
    approvedAt: record.approvedAt ? formatDate(record.approvedAt) : null,
    shiftDate: deriveShiftDate(record),
    approverId: record.approverId ?? null,
    approverName: record.approverName ?? '',
    comment: record.comment ?? null,
    halfDaySession,
    isHalfDay: days === 0.5 || Boolean(halfDaySession),
    days
  };
}

function buildApplicationWhere(
  params: GetLeaveApplicationsParams
): Prisma.LeaveApplicationWhereInput {
  const where: Prisma.LeaveApplicationWhereInput = {};

  if (params.staffId) {
    where.staffId = params.staffId;
  }

  if (params.leaveTypeId && params.leaveTypeId !== '__all__') {
    where.leaveTypeId = params.leaveTypeId;
  }

  if (params.approverId) {
    where.approverId = params.approverId;
  }

  if (params.outWithCancel === 'yes') {
    where.outWithCancel = true;
  } else if (params.outWithCancel === 'no') {
    where.outWithCancel = false;
  }

  const fromDate = parseOptionalDate(params.fromDate);
  const toDate = parseOptionalDate(params.toDate);
  const dateSearchBy = params.dateSearchBy ?? 'created';

  if (fromDate || toDate) {
    if (dateSearchBy === 'approved') {
      where.approvedAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {})
      };
    } else if (dateSearchBy === 'shift') {
      // Phase 3: use leave fromDate as shift proxy until Process Shift is fully wired
      where.fromDate = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {})
      };
    } else {
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {})
      };
    }
  }

  return where;
}

async function resolveApproverName(
  approverId?: string | null
): Promise<string | null> {
  if (!approverId) return null;
  const user = await authPrisma.user.findUnique({
    where: { id: approverId },
    select: { id: true, name: true }
  });
  return user?.name ?? null;
}

export async function getLeaveApplications(
  params: GetLeaveApplicationsParams
): Promise<{
  success: boolean;
  data?: { records: any[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const defaultPage = process.env.DEFAULT_PAGE ?? '0';
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
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
    const where = buildApplicationWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.leaveApplication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          leaveType: {
            select: { id: true, name: true, code: true, allowHalfDay: true }
          },
          staff: { select: { id: true, name: true, code: true } }
        }
      }),
      prisma.leaveApplication.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: withUsers.map(mapApplicationRecord),
        totalRecords
      },
      message: 'Leave applications fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveApplications error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch leave applications' }
    };
  }
}

export async function getLeaveApplicationsForExport(
  params: Omit<GetLeaveApplicationsParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const where = buildApplicationWhere(params);
    const exportLimit =
      Number.parseInt(process.env.EXPORT_LIMIT ?? '1000', 10) || 1000;
    const records = await prisma.leaveApplication.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: exportLimit,
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, allowHalfDay: true }
        },
        staff: { select: { id: true, name: true, code: true } }
      }
    });
    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: withUsers.map(mapApplicationRecord),
      message: 'Leave applications export fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveApplicationsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export leave applications' }
    };
  }
}

export async function getLeaveApplicationById(id: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }

    const record = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, allowHalfDay: true }
        },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    if (!record) {
      return {
        success: false,
        error: { message: 'Leave application not found' }
      };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    return {
      success: true,
      data: mapApplicationRecord(withUsers),
      message: 'Leave application fetched successfully'
    };
  } catch (error: any) {
    console.error('getLeaveApplicationById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get leave application' }
    };
  }
}

export async function createLeaveApplication(
  payload: LeaveApplicationPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = leaveApplicationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<
            string,
            string[]
          >
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);

    const [staff, leaveType] = await Promise.all([
      prisma.staff.findUnique({
        where: { id: data.staffId },
        select: { id: true, code: true, name: true }
      }),
      prisma.leaveType.findUnique({
        where: { id: data.leaveTypeId },
        select: { id: true, status: true, allowHalfDay: true, name: true }
      })
    ]);

    if (!staff) {
      return {
        success: false,
        error: {
          message: 'Staff not found',
          issues: { staffId: ['Selected staff was not found'] }
        }
      };
    }

    if (!staff.code?.trim()) {
      return {
        success: false,
        error: {
          message: 'Staff code is required to generate a form number',
          issues: { staffId: ['Selected staff has no staff code'] }
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

    if (leaveType.status !== 1) {
      return {
        success: false,
        error: {
          message: 'Leave type is not active',
          issues: { leaveTypeId: ['Selected leave type is not active'] }
        }
      };
    }

    if (data.isHalfDay && !leaveType.allowHalfDay) {
      return {
        success: false,
        error: {
          message: 'Half-day leave is not allowed for this leave type',
          issues: { isHalfDay: ['Half-day leave is not allowed for this type'] }
        }
      };
    }

    const leaveFromDate = data.fromDate;
    const leaveToDate = data.isHalfDay ? data.fromDate : data.toDate;
    const halfDaySession = data.isHalfDay
      ? (data.halfDaySession ?? null)
      : null;

    const days = computeLeaveApplicationDays({
      fromDate: leaveFromDate,
      toDate: leaveToDate,
      isHalfDay: data.isHalfDay,
      allowHalfDay: leaveType.allowHalfDay,
      halfDaySession
    });

    if (days <= 0) {
      return {
        success: false,
        error: {
          message: 'Invalid leave duration',
          issues: { toDate: ['Leave duration must be greater than 0'] }
        }
      };
    }

    const generated = await generateRecordCode(staff.code);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message:
            generated.errorCode === 'INVALID_PREFIX'
              ? 'Unable to generate form number from staff code'
              : 'Form number sequence limit exceeded'
        }
      };
    }

    const approverName = await resolveApproverName(data.approverId);
    if (data.approverId && !approverName) {
      return {
        success: false,
        error: {
          message: 'Approver not found',
          issues: { approverId: ['Selected approver was not found'] }
        }
      };
    }

    const shifts = mapShiftsForWrite(data.shifts as LeaveApplicationShiftRow[]);

    const record = await prisma.leaveApplication.create({
      data: {
        formNumber: generated.code,
        staffId: data.staffId,
        leaveTypeId: data.leaveTypeId,
        fromDate: leaveFromDate,
        toDate: leaveToDate,
        days,
        halfDaySession,
        requestedDate: data.requestedDate ?? new Date(),
        approverId: data.approverId || null,
        approverName: approverName,
        status: 'pending',
        outWithCancel: data.outWithCancel ?? false,
        comment: data.comment ?? null,
        lieuShiftId: data.lieuShiftId ?? null,
        lieuShiftLabel: data.lieuShiftLabel ?? null,
        entitleSnapshot: data.entitleSnapshot ?? null,
        utilizedSnapshot: data.utilizedSnapshot ?? null,
        balanceSnapshot: data.balanceSnapshot ?? null,
        shifts,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, allowHalfDay: true }
        },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    return {
      success: true,
      data: mapApplicationRecord(record),
      message: 'Leave application created successfully'
    };
  } catch (error: any) {
    console.error('createLeaveApplication error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A leave application with this form number already exists.'
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create leave application' }
    };
  }
}

export async function updateLeaveApplication(
  id: string,
  payload: LeaveApplicationPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = leaveApplicationUpdatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<
            string,
            string[]
          >
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);

    const existing = await prisma.leaveApplication.findUnique({
      where: { id }
    });

    if (!existing) {
      return {
        success: false,
        error: { message: 'Leave application not found' }
      };
    }

    if (existing.status !== 'pending') {
      return {
        success: false,
        error: {
          message: 'Only pending leave applications can be edited'
        }
      };
    }

    const [staff, leaveType] = await Promise.all([
      prisma.staff.findUnique({
        where: { id: data.staffId },
        select: { id: true, code: true }
      }),
      prisma.leaveType.findUnique({
        where: { id: data.leaveTypeId },
        select: { id: true, status: true, allowHalfDay: true }
      })
    ]);

    if (!staff) {
      return {
        success: false,
        error: {
          message: 'Staff not found',
          issues: { staffId: ['Selected staff was not found'] }
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

    if (data.isHalfDay && !leaveType.allowHalfDay) {
      return {
        success: false,
        error: {
          message: 'Half-day leave is not allowed for this leave type',
          issues: { isHalfDay: ['Half-day leave is not allowed for this type'] }
        }
      };
    }

    const leaveFromDate = data.fromDate;
    const leaveToDate = data.isHalfDay ? data.fromDate : data.toDate;
    const halfDaySession = data.isHalfDay
      ? (data.halfDaySession ?? null)
      : null;

    const days = computeLeaveApplicationDays({
      fromDate: leaveFromDate,
      toDate: leaveToDate,
      isHalfDay: data.isHalfDay,
      allowHalfDay: leaveType.allowHalfDay,
      halfDaySession
    });

    if (days <= 0) {
      return {
        success: false,
        error: {
          message: 'Invalid leave duration',
          issues: { toDate: ['Leave duration must be greater than 0'] }
        }
      };
    }

    const approverName = await resolveApproverName(data.approverId);
    if (data.approverId && !approverName) {
      return {
        success: false,
        error: {
          message: 'Approver not found',
          issues: { approverId: ['Selected approver was not found'] }
        }
      };
    }

    const shifts =
      data.shifts !== undefined
        ? mapShiftsForWrite(data.shifts as LeaveApplicationShiftRow[])
        : undefined;

    const record = await prisma.leaveApplication.update({
      where: { id },
      data: {
        staffId: data.staffId,
        leaveTypeId: data.leaveTypeId,
        fromDate: leaveFromDate,
        toDate: leaveToDate,
        days,
        halfDaySession,
        requestedDate: data.requestedDate ?? existing.requestedDate,
        approverId: data.approverId || null,
        approverName: approverName,
        outWithCancel: data.outWithCancel ?? false,
        comment: data.comment ?? null,
        lieuShiftId: data.lieuShiftId ?? null,
        lieuShiftLabel: data.lieuShiftLabel ?? null,
        ...(data.entitleSnapshot !== undefined && {
          entitleSnapshot: data.entitleSnapshot
        }),
        ...(data.utilizedSnapshot !== undefined && {
          utilizedSnapshot: data.utilizedSnapshot
        }),
        ...(data.balanceSnapshot !== undefined && {
          balanceSnapshot: data.balanceSnapshot
        }),
        ...(shifts !== undefined && { shifts }),
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, allowHalfDay: true }
        },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    return {
      success: true,
      data: mapApplicationRecord(record),
      message: 'Leave application updated successfully'
    };
  } catch (error: any) {
    console.error('updateLeaveApplication error:', error);
    if (error.code === 'P2025') {
      return {
        success: false,
        error: { message: 'Leave application not found' }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update leave application' }
    };
  }
}

export async function deleteLeaveApplication(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const existing = await prisma.leaveApplication.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    if (!existing) {
      return {
        success: false,
        error: { message: 'Leave application not found' }
      };
    }

    await prisma.leaveApplication.delete({ where: { id } });
    return {
      success: true,
      message: 'Leave application deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteLeaveApplication error:', error);
    if (error.code === 'P2025') {
      return {
        success: false,
        error: { message: 'Leave application not found' }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to delete leave application' }
    };
  }
}

/**
 * Approve a pending application: deduct days from covering entitlement.
 * Sets status approved, approver fields, approvedAt.
 */
export async function approveLeaveApplication(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }

    const auditUser = toAuditUser(user);
    if (!auditUser?.id) {
      return {
        success: false,
        error: { message: 'Approver identity is required' }
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveApplication.findUnique({ where: { id } });
      if (!existing) {
        return { ok: false as const, message: 'Leave application not found' };
      }
      if (existing.status !== 'pending') {
        return {
          ok: false as const,
          message: `Cannot approve an application with status "${existing.status}"`
        };
      }

      const entitlement = await tx.leaveEntitlement.findFirst({
        where: {
          staffId: existing.staffId,
          leaveTypeId: existing.leaveTypeId,
          status: { in: ['active', 'pending'] },
          fromDate: { lte: existing.toDate },
          toDate: { gte: existing.fromDate }
        },
        orderBy: { fromDate: 'desc' }
      });

      if (!entitlement) {
        return {
          ok: false as const,
          message:
            'No covering leave entitlement found for this staff, leave type, and dates'
        };
      }

      const days = Number(existing.days ?? 0);
      if (days <= 0) {
        return {
          ok: false as const,
          message: 'Application has invalid leave days'
        };
      }

      if (entitlement.remaining < days) {
        return {
          ok: false as const,
          message: `Insufficient leave balance (remaining ${entitlement.remaining}, required ${days})`
        };
      }

      const used = entitlement.used + days;
      const remaining = computeEntitlementRemaining(
        entitlement.entitled,
        entitlement.carryForward,
        used
      );

      await tx.leaveEntitlement.update({
        where: { id: entitlement.id },
        data: { used, remaining }
      });

      const record = await tx.leaveApplication.update({
        where: { id },
        data: {
          status: 'approved',
          approverId: auditUser.id,
          approverName: auditUser.name ?? null,
          approvedAt: new Date(),
          updatedBy: auditUser.id
        },
        include: {
          leaveType: {
            select: { id: true, name: true, code: true, allowHalfDay: true }
          },
          staff: { select: { id: true, name: true, code: true } }
        }
      });

      return { ok: true as const, record };
    });

    if (!result.ok) {
      return { success: false, error: { message: result.message } };
    }

    return {
      success: true,
      data: mapApplicationRecord(result.record),
      message: 'Leave application approved successfully'
    };
  } catch (error: any) {
    console.error('approveLeaveApplication error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to approve leave application' }
    };
  }
}

/**
 * Reject a pending application. No entitlement change.
 */
export async function rejectLeaveApplication(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }

    const auditUser = toAuditUser(user);
    if (!auditUser?.id) {
      return {
        success: false,
        error: { message: 'Approver identity is required' }
      };
    }

    const existing = await prisma.leaveApplication.findUnique({
      where: { id }
    });
    if (!existing) {
      return {
        success: false,
        error: { message: 'Leave application not found' }
      };
    }
    if (existing.status !== 'pending') {
      return {
        success: false,
        error: {
          message: `Cannot reject an application with status "${existing.status}"`
        }
      };
    }

    const record = await prisma.leaveApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        approverId: auditUser.id,
        approverName: auditUser.name ?? null,
        approvedAt: new Date(),
        updatedBy: auditUser.id
      },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, allowHalfDay: true }
        },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    return {
      success: true,
      data: mapApplicationRecord(record),
      message: 'Leave application rejected successfully'
    };
  } catch (error: any) {
    console.error('rejectLeaveApplication error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to reject leave application' }
    };
  }
}

/**
 * Cancel an application.
 * - pending → cancelled (no entitlement change)
 * - approved → reverse entitlement usage, then cancelled
 */
export async function cancelLeaveApplication(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }

    const auditUser = toAuditUser(user);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveApplication.findUnique({ where: { id } });
      if (!existing) {
        return { ok: false as const, message: 'Leave application not found' };
      }

      if (existing.status === 'cancelled') {
        return {
          ok: false as const,
          message: 'Leave application is already cancelled'
        };
      }
      if (existing.status === 'rejected') {
        return {
          ok: false as const,
          message: 'Cannot cancel a rejected application'
        };
      }

      if (existing.status === 'approved') {
        const entitlement = await tx.leaveEntitlement.findFirst({
          where: {
            staffId: existing.staffId,
            leaveTypeId: existing.leaveTypeId,
            status: { in: ['active', 'pending'] },
            fromDate: { lte: existing.toDate },
            toDate: { gte: existing.fromDate }
          },
          orderBy: { fromDate: 'desc' }
        });

        if (entitlement) {
          const days = Number(existing.days ?? 0);
          const used = Math.max(0, entitlement.used - days);
          const remaining = computeEntitlementRemaining(
            entitlement.entitled,
            entitlement.carryForward,
            used
          );
          await tx.leaveEntitlement.update({
            where: { id: entitlement.id },
            data: { used, remaining }
          });
        }
      } else if (existing.status !== 'pending') {
        return {
          ok: false as const,
          message: `Cannot cancel an application with status "${existing.status}"`
        };
      }

      const record = await tx.leaveApplication.update({
        where: { id },
        data: {
          status: 'cancelled',
          ...(auditUser?.id && { updatedBy: auditUser.id })
        },
        include: {
          leaveType: {
            select: { id: true, name: true, code: true, allowHalfDay: true }
          },
          staff: { select: { id: true, name: true, code: true } }
        }
      });

      return { ok: true as const, record };
    });

    if (!result.ok) {
      return { success: false, error: { message: result.message } };
    }

    return {
      success: true,
      data: mapApplicationRecord(result.record),
      message: 'Leave application cancelled successfully'
    };
  } catch (error: any) {
    console.error('cancelLeaveApplication error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to cancel leave application' }
    };
  }
}

export async function deleteLeaveApplications(ids: string[]): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (!uniqueIds.length) {
      return { success: false, error: { message: 'No applications selected' } };
    }

    await prisma.leaveApplication.deleteMany({
      where: { id: { in: uniqueIds } }
    });

    return {
      success: true,
      message: 'Leave applications deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteLeaveApplications error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete leave applications'
      }
    };
  }
}

export type LeaveApproverOption = { id: string; name: string };

/** Auth users who can act as leave approvers (admin or leave-application/leave-management edit). */
export async function getLeaveApproverOptions(): Promise<{
  success: boolean;
  data?: LeaveApproverOption[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const take =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;

    const users = await authPrisma.user.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(take, 50), 300),
      select: {
        id: true,
        name: true,
        userType: true,
        userGroup: { select: { permissions: true } }
      }
    });

    const options = users
      .filter((user) => {
        if (user.userType === userTypes.admin) return true;
        const permissions = user.userGroup?.permissions as Permissions | null;
        return (
          hasPermission(permissions, 'leave-application', 'edit') ||
          hasPermission(permissions, 'leave-management', 'edit') ||
          hasPermission(permissions, 'leave-application', 'view')
        );
      })
      .map((user) => ({ id: user.id, name: user.name }));

    return {
      success: true,
      data: options,
      message: 'Approver options fetched'
    };
  } catch (error: any) {
    console.error('getLeaveApproverOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch approver options' }
    };
  }
}

/** Snapshot for Recalculate: covering entitlement for staff + type + leave dates. */
export async function getLeaveApplicationBalanceSnapshot(params: {
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | string;
  toDate: Date | string;
}): Promise<{
  success: boolean;
  data?: {
    entitle: number;
    utilized: number;
    balance: number;
  };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);

    if (
      !params.staffId ||
      !params.leaveTypeId ||
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      return {
        success: true,
        data: { entitle: 0, utilized: 0, balance: 0 }
      };
    }

    const entitlement = await prisma.leaveEntitlement.findFirst({
      where: {
        staffId: params.staffId,
        leaveTypeId: params.leaveTypeId,
        status: { in: ['active', 'pending'] },
        fromDate: { lte: toDate },
        toDate: { gte: fromDate }
      },
      orderBy: { fromDate: 'desc' }
    });

    if (!entitlement) {
      return {
        success: true,
        data: { entitle: 0, utilized: 0, balance: 0 }
      };
    }

    return {
      success: true,
      data: {
        entitle: entitlement.entitled + entitlement.carryForward,
        utilized: entitlement.used,
        balance: entitlement.remaining
      }
    };
  } catch (error: any) {
    console.error('getLeaveApplicationBalanceSnapshot error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to recalculate leave balance' }
    };
  }
}
