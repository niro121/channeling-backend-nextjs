'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  EXTRA_TIME_CODE_PREFIX,
  EXTRA_TIME_TIME_TYPES,
  type ExtraTimePayload,
  type ExtraTimeRecord,
  type ExtraTimeTimeType,
  type GetExtraTimeParams
} from '@/types/overtime';
import {
  computeOvertimeHours,
  formatOvertimeDateTime,
  resolveApproverName,
  staffRosterSnapshot
} from './overtime-shared';

const extraTimePayloadSchema = z
  .object({
    staffId: z.string().min(1, 'Staff is required'),
    shiftDate: z.coerce.date(),
    shiftId: z.string().nullable().optional(),
    shiftLabel: z.string().nullable().optional(),
    timeType: z.enum(EXTRA_TIME_TIME_TYPES),
    fromAt: z.coerce.date(),
    toAt: z.coerce.date(),
    approverId: z.string().nullable().optional(),
    comment: z.string().nullable().optional()
  })
  .superRefine((data, ctx) => {
    if (data.toAt.getTime() === data.fromAt.getTime()) {
      ctx.addIssue({
        code: 'custom',
        message: 'To time must differ from From time',
        path: ['toAt']
      });
    }
  });

function parseOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapExtraTimeRecord(record: any): ExtraTimeRecord {
  const timeType: ExtraTimeTimeType =
    record.timeType === 'inTime' ? 'inTime' : 'outTime';
  const createdAt = formatOvertimeDateTime(record.createdAt);
  const updatedAt = formatOvertimeDateTime(record.updatedAt);

  return {
    id: record.id,
    formNumber: record.formNumber,
    staffId: record.staffId,
    staffCode: record.staff?.code ?? record.staffCode ?? '',
    staffName: record.staff?.name ?? record.staffName ?? '',
    roster: record.roster ?? '',
    shiftId: record.shiftId ?? '',
    shiftLabel: record.shiftLabel ?? '',
    shiftStart: record.shiftStart ?? '',
    shiftEnd: record.shiftEnd ?? '',
    timeType,
    fromAt: formatOvertimeDateTime(record.fromAt),
    toAt: formatOvertimeDateTime(record.toAt),
    hours: Number(record.hours ?? 0),
    approverId: record.approverId ?? '',
    approverName: record.approverName ?? '',
    comment: record.comment ?? '',
    status: record.status ?? 'pending',
    createdByName: record.createdUser?.name ?? '',
    updatedByName: record.updatedUser?.name ?? '',
    createdAt,
    updatedAt,
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    createdUser: record.createdUser ?? null,
    updatedUser: record.updatedUser ?? null
  };
}

function buildExtraTimeWhere(
  params: GetExtraTimeParams
): Prisma.OvertimeExtraTimeWhereInput {
  const where: Prisma.OvertimeExtraTimeWhereInput = {};

  if (params.staffId) where.staffId = params.staffId;
  if (params.approverId) where.approverId = params.approverId;

  const fromDate = parseOptionalDate(params.fromDate);
  const toDate = parseOptionalDate(params.toDate);
  if (fromDate || toDate) {
    where.fromAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    };
  }

  return where;
}

const extraTimeInclude = {
  staff: { select: { id: true, name: true, code: true } }
} as const;

export async function getExtraTimeRecords(params: GetExtraTimeParams): Promise<{
  success: boolean;
  data?: { records: ExtraTimeRecord[]; totalRecords: number };
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
    const where = buildExtraTimeWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.overtimeExtraTime.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }],
        include: extraTimeInclude
      }),
      prisma.overtimeExtraTime.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: withUsers.map(mapExtraTimeRecord),
        totalRecords
      },
      message: 'Extra time forms fetched successfully'
    };
  } catch (error: any) {
    console.error('getExtraTimeRecords error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch extra time forms' }
    };
  }
}

export async function getExtraTimeRecordsForExport(
  params: Omit<GetExtraTimeParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: ExtraTimeRecord[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const where = buildExtraTimeWhere(params);
    const exportLimit =
      Number.parseInt(process.env.EXPORT_LIMIT ?? '1000', 10) || 1000;
    const records = await prisma.overtimeExtraTime.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: exportLimit,
      include: extraTimeInclude
    });
    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: withUsers.map(mapExtraTimeRecord),
      message: 'Extra time export fetched successfully'
    };
  } catch (error: any) {
    console.error('getExtraTimeRecordsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export extra time forms' }
    };
  }
}

export async function createExtraTimeRecord(
  payload: ExtraTimePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ExtraTimeRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = extraTimePayloadSchema.safeParse(payload);
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

    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: {
        id: true,
        code: true,
        name: true,
        employmentDetails: true
      }
    });

    if (!staff) {
      return {
        success: false,
        error: {
          message: 'Staff not found',
          issues: { staffId: ['Selected staff was not found'] }
        }
      };
    }

    const generated = await generateRecordCode(EXTRA_TIME_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Unable to generate form number' }
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

    const hours = computeOvertimeHours(data.fromAt, data.toAt);
    const shiftLabel = data.shiftLabel?.trim() || '';
    const [shiftStart, shiftEnd] = shiftLabel.includes('-')
      ? shiftLabel.split('-').map((part) => part.trim())
      : ['', ''];

    const record = await prisma.overtimeExtraTime.create({
      data: {
        formNumber: generated.code,
        staffId: data.staffId,
        staffCode: staff.code,
        staffName: staff.name,
        roster: staffRosterSnapshot(staff),
        shiftDate: data.shiftDate,
        shiftId: data.shiftId ?? '',
        shiftLabel,
        shiftStart,
        shiftEnd,
        timeType: data.timeType,
        fromAt: data.fromAt,
        toAt: data.toAt,
        hours,
        approverId: data.approverId || null,
        approverName,
        status: 'pending',
        comment: data.comment ?? null,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      include: extraTimeInclude
    });

    return {
      success: true,
      data: mapExtraTimeRecord(record),
      message: 'Extra time form created successfully'
    };
  } catch (error: any) {
    console.error('createExtraTimeRecord error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: { message: 'Form number already exists. Please try again.' }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create extra time form' }
    };
  }
}

export async function updateExtraTimeRecord(
  id: string,
  payload: ExtraTimePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ExtraTimeRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid extra time ID' } };
    }

    const parsed = extraTimePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const existing = await prisma.overtimeExtraTime.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Extra time form not found' } };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);

    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: {
        id: true,
        code: true,
        name: true,
        employmentDetails: true
      }
    });

    if (!staff) {
      return {
        success: false,
        error: {
          message: 'Staff not found',
          issues: { staffId: ['Selected staff was not found'] }
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

    const hours = computeOvertimeHours(data.fromAt, data.toAt);
    const shiftLabel = data.shiftLabel?.trim() || '';
    const [shiftStart, shiftEnd] = shiftLabel.includes('-')
      ? shiftLabel.split('-').map((part) => part.trim())
      : ['', ''];

    const record = await prisma.overtimeExtraTime.update({
      where: { id },
      data: {
        staffId: data.staffId,
        staffCode: staff.code,
        staffName: staff.name,
        roster: staffRosterSnapshot(staff),
        shiftDate: data.shiftDate,
        shiftId: data.shiftId ?? '',
        shiftLabel,
        shiftStart,
        shiftEnd,
        timeType: data.timeType,
        fromAt: data.fromAt,
        toAt: data.toAt,
        hours,
        approverId: data.approverId || null,
        approverName,
        comment: data.comment ?? null,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      include: extraTimeInclude
    });

    const [withUsers] = await resolveAuthUsers([record]);
    return {
      success: true,
      data: mapExtraTimeRecord(withUsers),
      message: 'Extra time form updated successfully'
    };
  } catch (error: any) {
    console.error('updateExtraTimeRecord error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update extra time form' }
    };
  }
}

export async function deleteExtraTimeRecord(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid extra time ID' } };
    }

    await prisma.overtimeExtraTime.delete({ where: { id } });
    return { success: true, message: 'Extra time form deleted successfully' };
  } catch (error: any) {
    console.error('deleteExtraTimeRecord error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete extra time form' }
    };
  }
}
