'use server';

import { z } from 'zod';
import { authPrisma } from '@archmage/db-auth';
import type { Permissions } from '@archmage/shared';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { format } from 'date-fns';
import {
  addColomboCivilDays,
  colomboCivilDayUtc,
  colomboWallTimeToUtc,
  parseHhMmToMinutes,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import {
  computeLeaveApplicationDays,
  isHalfDaySession,
  isSameLocalDay
} from '@/lib/helpers/leave-application-days.helper';
import { dutyOverlapsLeaveWindow } from '@/lib/helpers/roster/shift-time-overlap.helper';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { hasPermission } from '@/lib/permissions';
import { userTypes } from '@/lib/roles';
import { formatDate } from '@/lib/utils/date';
import {
  computeEntitlementRemaining,
  LEAVE_APPLICATION_DELETABLE_STATUSES,
  LEAVE_HALF_DAY_SESSIONS,
  LIEU_SOURCE_LOOKBACK_DAYS,
  type GetLeaveApplicationsParams,
  type GetLeaveApplicationsReturn,
  type LeaveApplicationPayload,
  type LeaveApplicationRecord,
  type LeaveApplicationShiftRow,
  type LeaveLieuSourceDutyRow,
  type LeaveProcessedDutyRow
} from '@/types/leave';

const DELETABLE_STATUS_SET = new Set<string>([
  ...LEAVE_APPLICATION_DELETABLE_STATUSES
]);

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
    acknowledgedWarnings: z.boolean().optional().default(false),
    shifts: z
      .array(
        z.object({
          shiftLabel: z.string().min(1),
          from: z.coerce.date(),
          to: z.coerce.date(),
          shiftDate: z.coerce.date().nullable().optional(),
          department: z.string().nullable().optional(),
          allocationId: z.string().nullable().optional()
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
    ...(shift.shiftDate ? { shiftDate: new Date(shift.shiftDate) } : {}),
    ...(shift.department?.trim()
      ? { department: shift.department.trim() }
      : {}),
    ...(shift.allocationId?.trim()
      ? { allocationId: shift.allocationId.trim() }
      : {})
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

type LeaveDbClient = Prisma.TransactionClient | typeof prisma;

async function getCoveringEntitlementAvailability(
  params: {
    staffId: string;
    leaveTypeId: string;
    fromDate: Date;
    toDate: Date;
    excludeApplicationId?: string;
  },
  db: LeaveDbClient = prisma
): Promise<{
  entitlement: {
    id: string;
    entitled: number;
    carryForward: number;
    used: number;
    remaining: number;
    fromDate: Date;
    toDate: Date;
  } | null;
  pendingReserved: number;
  available: number;
}> {
  const entitlement = await db.leaveEntitlement.findFirst({
    where: {
      staffId: params.staffId,
      leaveTypeId: params.leaveTypeId,
      status: { in: ['active', 'pending'] },
      fromDate: { lte: params.toDate },
      toDate: { gte: params.fromDate }
    },
    orderBy: { fromDate: 'desc' },
    select: {
      id: true,
      entitled: true,
      carryForward: true,
      used: true,
      remaining: true,
      fromDate: true,
      toDate: true
    }
  });

  if (!entitlement) {
    return { entitlement: null, pendingReserved: 0, available: 0 };
  }

  const pendingApps = await db.leaveApplication.findMany({
    where: {
      staffId: params.staffId,
      leaveTypeId: params.leaveTypeId,
      status: 'pending',
      ...(params.excludeApplicationId
        ? { id: { not: params.excludeApplicationId } }
        : {}),
      fromDate: { lte: entitlement.toDate },
      toDate: { gte: entitlement.fromDate }
    },
    select: { days: true }
  });

  const pendingReserved = pendingApps.reduce(
    (sum, row) => sum + Number(row.days ?? 0),
    0
  );
  const available = Math.max(0, entitlement.remaining - pendingReserved);

  return { entitlement, pendingReserved, available };
}

function insufficientBalanceError(
  required: number,
  available: number,
  remaining: number,
  pendingReserved: number
) {
  const pendingNote =
    pendingReserved > 0
      ? ` (${remaining} remaining minus ${pendingReserved} reserved by other pending applications)`
      : '';
  return {
    success: false as const,
    error: {
      message: `Insufficient leave balance (available ${available}, required ${required})${pendingNote}`,
      issues: {
        toDate: [
          `Requested ${required} day(s) exceeds available balance (${available}).`
        ],
        fromDate: [
          `Requested ${required} day(s) exceeds available balance (${available}).`
        ]
      }
    }
  };
}

/**
 * Soft warn when published/amended roster duties already exist in the leave
 * range (approve / auto-approve). Pass acknowledgedWarnings to continue.
 */
async function assertPublishedDutySoftWarn(input: {
  staffId: string;
  fromDate: Date;
  toDate: Date;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
  acknowledgedWarnings?: boolean;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      requiresAck: true;
      message: string;
      softWarnings: string[];
    }
> {
  if (input.acknowledgedWarnings) {
    return { ok: true };
  }

  const duties = await listPublishedDutiesForLeavePeriod({
    staffId: input.staffId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    isHalfDay: input.isHalfDay,
    halfDaySession: input.halfDaySession
  });

  if (!duties.success) {
    return { ok: true };
  }

  const count = duties.data?.length ?? 0;
  if (count === 0) {
    return { ok: true };
  }

  const message =
    count === 1
      ? 'This staff member already has 1 published duty in the leave date range. Continue approving leave anyway? If they work, cancel the leave later to restore entitlement.'
      : `This staff member already has ${count} published duties in the leave date range. Continue approving leave anyway? If they work, cancel the leave later to restore entitlement.`;

  return {
    ok: false,
    requiresAck: true,
    message,
    softWarnings: [message]
  };
}

function isDeletableLeaveApplicationStatus(status: string | null | undefined) {
  return DELETABLE_STATUS_SET.has(String(status ?? ''));
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

export async function getLeaveApplicationsForExport({
  staffId,
  leaveTypeId,
  approverId,
  fromDate,
  toDate,
  dateSearchBy,
  outWithCancel
}: {
  staffId?: string;
  leaveTypeId?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
  dateSearchBy?: string;
  outWithCancel?: string;
}): Promise<GetLeaveApplicationsReturn> {
  try {
    const where = buildApplicationWhere({
      staffId,
      leaveTypeId,
      approverId,
      fromDate,
      toDate,
      dateSearchBy,
      outWithCancel
    });

    const records = await prisma.leaveApplication.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        leaveType: {
          select: { id: true, name: true, code: true, allowHalfDay: true }
        },
        staff: { select: { id: true, name: true, code: true } }
      }
    });

    const recordsWithUsers = await resolveAuthUsers(records);
    const data = recordsWithUsers.map(
      mapApplicationRecord
    ) as LeaveApplicationRecord[];

    return {
      data,
      totalRecords: data.length
    };
  } catch (error) {
    console.error('getLeaveApplicationsForExport error', error);
    throw new Error('Error getting data');
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
  autoApproved?: boolean;
  error?: {
    message?: string;
    issues?: Record<string, string[]>;
    requiresAck?: boolean;
    softWarnings?: string[];
  };
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
        select: {
          id: true,
          status: true,
          allowHalfDay: true,
          isLieuLeave: true,
          requiresApproval: true,
          name: true
        }
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

    const lieuTypeCheck = assertLieuLeaveTypeRules({
      isLieuLeave: Boolean(leaveType.isLieuLeave),
      lieuShiftId: data.lieuShiftId
    });
    if (!lieuTypeCheck.ok) {
      return {
        success: false,
        error: {
          message: lieuTypeCheck.message,
          issues: lieuTypeCheck.issues
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

    const availability = await getCoveringEntitlementAvailability({
      staffId: data.staffId,
      leaveTypeId: data.leaveTypeId,
      fromDate: leaveFromDate,
      toDate: leaveToDate
    });
    if (!availability.entitlement) {
      return {
        success: false,
        error: {
          message:
            'No covering leave entitlement found for this staff, leave type, and dates',
          issues: {
            leaveTypeId: [
              'No leave entitlement covers this leave type and date range'
            ],
            fromDate: [
              'No leave entitlement covers this leave type and date range'
            ]
          }
        }
      };
    }
    if (days > availability.available) {
      return insufficientBalanceError(
        days,
        availability.available,
        availability.entitlement.remaining,
        availability.pendingReserved
      );
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

    const shifts = mapShiftsForWrite(data.shifts as LeaveApplicationShiftRow[]);

    const lieuCheck = await assertLieuShiftEligible({
      staffId: data.staffId,
      fromDate: leaveFromDate,
      lieuShiftId: data.lieuShiftId,
      lieuShiftLabel: data.lieuShiftLabel
    });
    if (!lieuCheck.ok) {
      return {
        success: false,
        error: {
          message: lieuCheck.message,
          issues: { lieuShiftId: [lieuCheck.message] }
        }
      };
    }

    const requiresApproval = leaveType.requiresApproval !== false;
    const autoApprove = !requiresApproval;

    if (autoApprove) {
      if (!auditUser?.id) {
        return {
          success: false,
          error: {
            message:
              'User identity is required to auto-approve leave that does not require approval'
          }
        };
      }

      const dutyWarn = await assertPublishedDutySoftWarn({
        staffId: data.staffId,
        fromDate: leaveFromDate,
        toDate: leaveToDate,
        isHalfDay: data.isHalfDay,
        halfDaySession,
        acknowledgedWarnings: Boolean(data.acknowledgedWarnings)
      });
      if (!dutyWarn.ok) {
        return {
          success: false,
          error: {
            message: dutyWarn.message,
            requiresAck: true,
            softWarnings: dutyWarn.softWarnings
          }
        };
      }
    }

    const createData = {
      formNumber: generated.code,
      staffId: data.staffId,
      leaveTypeId: data.leaveTypeId,
      fromDate: leaveFromDate,
      toDate: leaveToDate,
      days,
      halfDaySession,
      requestedDate: data.requestedDate ?? new Date(),
      outWithCancel: data.outWithCancel ?? false,
      comment: data.comment ?? null,
      lieuShiftId: lieuCheck.lieuShiftId,
      lieuShiftLabel: lieuCheck.lieuShiftLabel,
      entitleSnapshot: data.entitleSnapshot ?? null,
      utilizedSnapshot: data.utilizedSnapshot ?? null,
      balanceSnapshot: data.balanceSnapshot ?? null,
      shifts,
      ...(auditUser?.id && {
        createdBy: auditUser.id,
        updatedBy: auditUser.id
      })
    };

    if (!autoApprove) {
      const record = await prisma.leaveApplication.create({
        data: {
          ...createData,
          approverId: null,
          approverName: null,
          status: 'pending'
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
        autoApproved: false,
        message: 'Leave application created successfully'
      };
    }

    const autoResult = await prisma.$transaction(async (tx) => {
      const availabilityTx = await getCoveringEntitlementAvailability(
        {
          staffId: data.staffId,
          leaveTypeId: data.leaveTypeId,
          fromDate: leaveFromDate,
          toDate: leaveToDate
        },
        tx
      );
      if (!availabilityTx.entitlement) {
        return {
          ok: false as const,
          message:
            'No covering leave entitlement found for this staff, leave type, and dates'
        };
      }
      if (days > availabilityTx.available) {
        return {
          ok: false as const,
          message: `Insufficient leave balance (available ${availabilityTx.available}, required ${days})`
        };
      }

      const entitlement = availabilityTx.entitlement;
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

      const record = await tx.leaveApplication.create({
        data: {
          ...createData,
          status: 'approved',
          approverId: auditUser!.id,
          approverName: auditUser!.name ?? null,
          approvedAt: new Date()
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

    if (!autoResult.ok) {
      return {
        success: false,
        error: { message: autoResult.message }
      };
    }

    return {
      success: true,
      data: mapApplicationRecord(autoResult.record),
      autoApproved: true,
      message: 'Leave application created and auto-approved successfully'
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
        select: {
          id: true,
          status: true,
          allowHalfDay: true,
          isLieuLeave: true
        }
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

    const lieuTypeCheck = assertLieuLeaveTypeRules({
      isLieuLeave: Boolean(leaveType.isLieuLeave),
      lieuShiftId: data.lieuShiftId
    });
    if (!lieuTypeCheck.ok) {
      return {
        success: false,
        error: {
          message: lieuTypeCheck.message,
          issues: lieuTypeCheck.issues
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

    const availability = await getCoveringEntitlementAvailability({
      staffId: data.staffId,
      leaveTypeId: data.leaveTypeId,
      fromDate: leaveFromDate,
      toDate: leaveToDate,
      excludeApplicationId: id
    });
    if (!availability.entitlement) {
      return {
        success: false,
        error: {
          message:
            'No covering leave entitlement found for this staff, leave type, and dates',
          issues: {
            leaveTypeId: [
              'No leave entitlement covers this leave type and date range'
            ],
            fromDate: [
              'No leave entitlement covers this leave type and date range'
            ]
          }
        }
      };
    }
    if (days > availability.available) {
      return insufficientBalanceError(
        days,
        availability.available,
        availability.entitlement.remaining,
        availability.pendingReserved
      );
    }

    const shifts =
      data.shifts !== undefined
        ? mapShiftsForWrite(data.shifts as LeaveApplicationShiftRow[])
        : undefined;

    const lieuCheck = await assertLieuShiftEligible({
      staffId: data.staffId,
      fromDate: leaveFromDate,
      lieuShiftId: data.lieuShiftId,
      lieuShiftLabel: data.lieuShiftLabel,
      excludeApplicationId: id
    });
    if (!lieuCheck.ok) {
      return {
        success: false,
        error: {
          message: lieuCheck.message,
          issues: { lieuShiftId: [lieuCheck.message] }
        }
      };
    }

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
        // Do not overwrite leave-management approver from the application form.
        outWithCancel: data.outWithCancel ?? false,
        comment: data.comment ?? null,
        lieuShiftId: lieuCheck.lieuShiftId,
        lieuShiftLabel: lieuCheck.lieuShiftLabel,
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

    if (!isDeletableLeaveApplicationStatus(existing.status)) {
      return {
        success: false,
        error: {
          message:
            existing.status === 'approved'
              ? 'Approved leave cannot be deleted. Cancel it first to restore entitlement usage.'
              : `Cannot delete a leave application with status "${existing.status}"`
        }
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
  user?: AuditUser,
  options?: { acknowledgedWarnings?: boolean }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    requiresAck?: boolean;
    softWarnings?: string[];
  };
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

    const existingForWarn = await prisma.leaveApplication.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        staffId: true,
        fromDate: true,
        toDate: true,
        halfDaySession: true,
        days: true
      }
    });
    if (!existingForWarn) {
      return {
        success: false,
        error: { message: 'Leave application not found' }
      };
    }
    if (existingForWarn.status !== 'pending') {
      return {
        success: false,
        error: {
          message: `Cannot approve an application with status "${existingForWarn.status}"`
        }
      };
    }

    const isHalfDay =
      Number(existingForWarn.days ?? 0) === 0.5 &&
      Boolean(existingForWarn.halfDaySession);
    const dutyWarn = await assertPublishedDutySoftWarn({
      staffId: existingForWarn.staffId,
      fromDate: existingForWarn.fromDate,
      toDate: existingForWarn.toDate,
      isHalfDay,
      halfDaySession: existingForWarn.halfDaySession,
      acknowledgedWarnings: Boolean(options?.acknowledgedWarnings)
    });
    if (!dutyWarn.ok) {
      return {
        success: false,
        error: {
          message: dutyWarn.message,
          requiresAck: true,
          softWarnings: dutyWarn.softWarnings
        }
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

      const days = Number(existing.days ?? 0);
      if (days <= 0) {
        return {
          ok: false as const,
          message: 'Application has invalid leave days'
        };
      }

      const availability = await getCoveringEntitlementAvailability(
        {
          staffId: existing.staffId,
          leaveTypeId: existing.leaveTypeId,
          fromDate: existing.fromDate,
          toDate: existing.toDate,
          excludeApplicationId: id
        },
        tx
      );

      if (!availability.entitlement) {
        return {
          ok: false as const,
          message:
            'No covering leave entitlement found for this staff, leave type, and dates'
        };
      }

      if (days > availability.available) {
        const pendingNote =
          availability.pendingReserved > 0
            ? ` (${availability.entitlement.remaining} remaining minus ${availability.pendingReserved} reserved by other pending applications)`
            : '';
        return {
          ok: false as const,
          message: `Insufficient leave balance (available ${availability.available}, required ${days})${pendingNote}`
        };
      }

      const entitlement = availability.entitlement;
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

    const rows = await prisma.leaveApplication.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, status: true, formNumber: true }
    });

    if (rows.length !== uniqueIds.length) {
      return {
        success: false,
        error: { message: 'One or more leave applications were not found' }
      };
    }

    const blocked = rows.filter(
      (row) => !isDeletableLeaveApplicationStatus(row.status)
    );
    if (blocked.length > 0) {
      const approvedCount = blocked.filter(
        (row) => row.status === 'approved'
      ).length;
      return {
        success: false,
        error: {
          message:
            approvedCount > 0
              ? `Cannot delete ${approvedCount} approved application(s). Cancel approved leave first, or select only pending, rejected, or cancelled rows.`
              : `Cannot delete ${blocked.length} application(s) with status that is not pending, rejected, or cancelled.`
        }
      };
    }

    await prisma.leaveApplication.deleteMany({
      where: {
        id: { in: uniqueIds },
        status: { in: [...LEAVE_APPLICATION_DELETABLE_STATUSES] }
      }
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

/**
 * Auth users who can approve leave (for filters / leave management identity).
 * Application form shows approver read-only after approval.
 */
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

/** Snapshot for covering entitlement for staff + type + leave dates. */
export async function getLeaveApplicationBalanceSnapshot(params: {
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | string;
  toDate: Date | string;
  excludeApplicationId?: string;
}): Promise<{
  success: boolean;
  data?: {
    entitle: number;
    utilized: number;
    balance: number;
    pendingReserved: number;
    available: number;
    hasEntitlement: boolean;
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
        data: {
          entitle: 0,
          utilized: 0,
          balance: 0,
          pendingReserved: 0,
          available: 0,
          hasEntitlement: false
        }
      };
    }

    const availability = await getCoveringEntitlementAvailability({
      staffId: params.staffId,
      leaveTypeId: params.leaveTypeId,
      fromDate,
      toDate,
      excludeApplicationId: params.excludeApplicationId
    });

    if (!availability.entitlement) {
      return {
        success: true,
        data: {
          entitle: 0,
          utilized: 0,
          balance: 0,
          pendingReserved: 0,
          available: 0,
          hasEntitlement: false
        }
      };
    }

    return {
      success: true,
      data: {
        entitle:
          availability.entitlement.entitled +
          availability.entitlement.carryForward,
        utilized: availability.entitlement.used,
        balance: availability.entitlement.remaining,
        pendingReserved: availability.pendingReserved,
        available: availability.available,
        hasEntitlement: true
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

function formatDutyShiftLabel(shiftType: {
  code?: string | null;
  name?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}): string {
  const code = shiftType.code?.trim() ?? '';
  const name = shiftType.name?.trim() ?? '';
  const base =
    code && name ? `${code} — ${name}` : code || name || 'Shift';
  const start = shiftType.startTime?.trim() ?? '';
  const end = shiftType.endTime?.trim() ?? '';
  if (start && end) return `${base} (${start}–${end})`;
  return base;
}

function dutyWindowFromAllocation(input: {
  date: Date;
  startTime: string;
  endTime: string;
}): { from: Date; to: Date } {
  const civilDay = colomboCivilDayUtc(input.date);
  const startMins = parseHhMmToMinutes(input.startTime) ?? 0;
  const endMins = parseHhMmToMinutes(input.endTime);
  const startHours = Math.floor(startMins / 60);
  const startMinutes = startMins % 60;
  const from = colomboWallTimeToUtc(civilDay, startHours, startMinutes);

  if (endMins == null) {
    return { from, to: from };
  }

  // Overnight: end <= start → end is next civil day.
  const overnight = endMins <= startMins;
  const endCivil = overnight
    ? new Date(civilDay.getTime() + 24 * 60 * 60 * 1000)
    : civilDay;
  const endHours = Math.floor(endMins / 60);
  const endMinutes = endMins % 60;
  const to = colomboWallTimeToUtc(endCivil, endHours, endMinutes);
  return { from, to };
}

/**
 * Process Shift: read published/amended RosterAllocation duties for staff
 * over the leave date range. Snapshot-only — does not mutate roster.
 */
export async function listPublishedDutiesForLeavePeriod(params: {
  staffId: string;
  fromDate: Date | string;
  toDate: Date | string;
  halfDaySession?: string | null;
  isHalfDay?: boolean;
}): Promise<{
  success: boolean;
  data?: LeaveProcessedDutyRow[];
  error?: { message?: string };
}> {
  try {
    const staffId = params.staffId?.trim();
    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);

    if (!staffId) {
      return {
        success: false,
        error: { message: 'Select staff before processing shifts.' }
      };
    }
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return {
        success: false,
        error: { message: 'Set leave date(s) before processing shifts.' }
      };
    }

    const fromUtc = colomboCivilDayUtc(fromDate);
    const toUtc = colomboCivilDayUtc(toDate);
    const rangeStart = fromUtc <= toUtc ? fromUtc : toUtc;
    const rangeEnd = fromUtc <= toUtc ? toUtc : fromUtc;

    const rows = await prisma.rosterAllocation.findMany({
      where: {
        staffId,
        status: { in: ['published', 'amended'] },
        date: { gte: rangeStart, lte: rangeEnd }
      },
      include: {
        shiftType: {
          select: {
            code: true,
            name: true,
            startTime: true,
            endTime: true
          }
        },
        dutyLocationDepartment: {
          select: { id: true, name: true }
        }
      },
      orderBy: [{ date: 'asc' }, { staffName: 'asc' }]
    });

    // RosterAllocation.department often stores Department ObjectId (same as Shift Assignment).
    const departmentIds = [
      ...new Set(
        rows
          .map((row) => row.department?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ];
    const departmentNameById = new Map(
      departmentIds.length
        ? (
            await prisma.department.findMany({
              where: { id: { in: departmentIds } },
              select: { id: true, name: true }
            })
          ).map((dept) => [dept.id, dept.name] as const)
        : []
    );

    const halfDay =
      Boolean(params.isHalfDay) && isHalfDaySession(params.halfDaySession);

    const duties: LeaveProcessedDutyRow[] = [];
    for (const row of rows) {
      const startTime = row.shiftType?.startTime?.trim() ?? '';
      const endTime = row.shiftType?.endTime?.trim() ?? '';

      if (
        halfDay &&
        startTime &&
        endTime &&
        !dutyOverlapsLeaveWindow({
          startTime,
          endTime,
          halfDaySession: params.halfDaySession,
          days: 0.5
        })
      ) {
        continue;
      }

      const { from, to } = dutyWindowFromAllocation({
        date: row.date,
        startTime: startTime || '00:00',
        endTime: endTime || startTime || '00:00'
      });

      const rawDepartment = row.department?.trim() ?? '';
      const departmentName =
        (rawDepartment
          ? departmentNameById.get(rawDepartment) ?? rawDepartment
          : '') ||
        row.dutyLocationDepartment?.name?.trim() ||
        '';

      duties.push({
        allocationId: row.id,
        shiftLabel: formatDutyShiftLabel({
          code: row.shiftType?.code,
          name: row.shiftType?.name,
          startTime,
          endTime
        }),
        department: departmentName,
        from,
        to,
        shiftDate: colomboCivilDayUtc(row.date),
        startTime,
        endTime
      });
    }

    return { success: true, data: duties };
  } catch (error: any) {
    console.error('listPublishedDutiesForLeavePeriod error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load published duties for leave'
      }
    };
  }
}

async function getLinkedLieuAllocationIds(params: {
  excludeApplicationId?: string;
}): Promise<Set<string>> {
  const rows = await prisma.leaveApplication.findMany({
    where: {
      status: { in: ['pending', 'approved'] },
      lieuShiftId: { not: null },
      ...(params.excludeApplicationId
        ? { id: { not: params.excludeApplicationId } }
        : {})
    },
    select: { lieuShiftId: true }
  });

  return new Set(
    rows
      .map((row) => row.lieuShiftId?.trim())
      .filter((id): id is string => Boolean(id))
  );
}

/**
 * Process Lieu Shift Phase A: published/amended duties with grantLieuLeave
 * in the LIEU_SOURCE_LOOKBACK_DAYS before leave fromDate, excluding
 * already-linked allocations.
 */
export async function listLieuSourceDutiesForLeave(params: {
  staffId: string;
  fromDate: Date | string;
  excludeApplicationId?: string;
}): Promise<{
  success: boolean;
  data?: LeaveLieuSourceDutyRow[];
  error?: { message?: string };
}> {
  try {
    const staffId = params.staffId?.trim();
    const fromDate = new Date(params.fromDate);

    if (!staffId) {
      return {
        success: false,
        error: { message: 'Select staff before processing lieu shifts.' }
      };
    }
    if (Number.isNaN(fromDate.getTime())) {
      return {
        success: false,
        error: { message: 'Set leave date(s) before processing lieu shifts.' }
      };
    }

    const leaveFromUtc = colomboCivilDayUtc(fromDate);
    const rangeStart = addColomboCivilDays(
      leaveFromUtc,
      -LIEU_SOURCE_LOOKBACK_DAYS
    );
    const linkedIds = await getLinkedLieuAllocationIds({
      excludeApplicationId: params.excludeApplicationId
    });

    const rows = await prisma.rosterAllocation.findMany({
      where: {
        staffId,
        status: { in: ['published', 'amended', 'approved'] },
        grantLieuLeave: true,
        date: { gte: rangeStart, lt: leaveFromUtc },
        ...(linkedIds.size > 0
          ? { id: { notIn: [...linkedIds] } }
          : {})
      },
      include: {
        shiftType: {
          select: {
            code: true,
            name: true,
            startTime: true,
            endTime: true
          }
        },
        dutyLocationDepartment: {
          select: { id: true, name: true }
        }
      },
      orderBy: [{ date: 'desc' }, { staffName: 'asc' }]
    });

    const departmentIds = [
      ...new Set(
        rows
          .map((row) => row.department?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ];
    const departmentNameById = new Map(
      departmentIds.length
        ? (
            await prisma.department.findMany({
              where: { id: { in: departmentIds } },
              select: { id: true, name: true }
            })
          ).map((dept) => [dept.id, dept.name] as const)
        : []
    );

    const duties: LeaveLieuSourceDutyRow[] = rows.map((row) => {
      const startTime = row.shiftType?.startTime?.trim() ?? '';
      const endTime = row.shiftType?.endTime?.trim() ?? '';
      const { from, to } = dutyWindowFromAllocation({
        date: row.date,
        startTime: startTime || '00:00',
        endTime: endTime || startTime || '00:00'
      });
      const rawDepartment = row.department?.trim() ?? '';
      const departmentName =
        (rawDepartment
          ? departmentNameById.get(rawDepartment) ?? rawDepartment
          : '') ||
        row.dutyLocationDepartment?.name?.trim() ||
        '';
      const shiftLabel = formatDutyShiftLabel({
        code: row.shiftType?.code,
        name: row.shiftType?.name,
        startTime,
        endTime
      });
      const shiftDate = colomboCivilDayUtc(row.date);
      const dateLabel = format(shiftDate, 'dd MMM yyyy');
      const deptPart = departmentName ? ` · ${departmentName}` : '';

      return {
        allocationId: row.id,
        shiftLabel,
        department: departmentName,
        from,
        to,
        shiftDate,
        startTime,
        endTime,
        optionLabel: `${dateLabel} — ${shiftLabel}${deptPart}`
      };
    });

    return { success: true, data: duties };
  } catch (error: any) {
    console.error('listLieuSourceDutiesForLeave error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load lieu source duties'
      }
    };
  }
}

type LieuShiftAssertResult =
  | {
      ok: true;
      lieuShiftId: string | null;
      lieuShiftLabel: string | null;
    }
  | { ok: false; message: string };

function assertLieuLeaveTypeRules(params: {
  isLieuLeave: boolean;
  lieuShiftId?: string | null;
}):
  | { ok: true }
  | { ok: false; message: string; issues: Record<string, string[]> } {
  const hasLieuShift = Boolean(params.lieuShiftId?.trim());

  if (hasLieuShift && !params.isLieuLeave) {
    return {
      ok: false,
      message:
        'Process Lieu Shift can only be used with a Lieu leave type. Enable “Lieu leave type” on the leave type.',
      issues: {
        leaveTypeId: ['Select the Lieu leave type for this application'],
        lieuShiftId: ['Lieu shift requires a Lieu leave type']
      }
    };
  }

  if (params.isLieuLeave && !hasLieuShift) {
    return {
      ok: false,
      message:
        'Lieu leave requires Process Lieu Shift — select the duty this leave is in return for.',
      issues: {
        lieuShiftId: ['Process Lieu Shift and select a staff duty']
      }
    };
  }

  return { ok: true };
}

/**
 * Validate optional lieuShiftId on create/update (Phase A uniqueness + eligibility).
 */
async function assertLieuShiftEligible(params: {
  staffId: string;
  fromDate: Date;
  lieuShiftId?: string | null;
  lieuShiftLabel?: string | null;
  excludeApplicationId?: string;
}): Promise<LieuShiftAssertResult> {
  const lieuShiftId = params.lieuShiftId?.trim() || null;
  if (!lieuShiftId) {
    return { ok: true, lieuShiftId: null, lieuShiftLabel: null };
  }

  const leaveFromUtc = colomboCivilDayUtc(params.fromDate);
  const rangeStart = addColomboCivilDays(
    leaveFromUtc,
    -LIEU_SOURCE_LOOKBACK_DAYS
  );

  const allocation = await prisma.rosterAllocation.findFirst({
    where: {
      id: lieuShiftId,
      staffId: params.staffId,
      status: { in: ['published', 'amended', 'approved'] },
      grantLieuLeave: true,
      date: { gte: rangeStart, lt: leaveFromUtc }
    },
    include: {
      shiftType: {
        select: { code: true, name: true, startTime: true, endTime: true }
      }
    }
  });

  if (!allocation) {
    return {
      ok: false,
      message: `Selected lieu shift is not an eligible published duty with Grant Lieu Leave in the ${LIEU_SOURCE_LOOKBACK_DAYS} days before leave start.`
    };
  }

  const linked = await prisma.leaveApplication.findFirst({
    where: {
      lieuShiftId,
      status: { in: ['pending', 'approved'] },
      ...(params.excludeApplicationId
        ? { id: { not: params.excludeApplicationId } }
        : {})
    },
    select: { formNumber: true }
  });

  if (linked) {
    return {
      ok: false,
      message: `This lieu shift is already linked to leave form ${linked.formNumber}.`
    };
  }

  const label =
    params.lieuShiftLabel?.trim() ||
    `${toColomboDateIso(allocation.date)} — ${formatDutyShiftLabel({
      code: allocation.shiftType?.code,
      name: allocation.shiftType?.name,
      startTime: allocation.shiftType?.startTime,
      endTime: allocation.shiftType?.endTime
    })}`;

  return {
    ok: true,
    lieuShiftId,
    lieuShiftLabel: label
  };
}
