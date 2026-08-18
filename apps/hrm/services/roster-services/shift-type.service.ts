'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  calcTotalWorkingHours,
  normalizeShiftTime
} from '@/lib/helpers/shift-duration';
import {
  SHIFT_TYPE_CATEGORIES,
  SHIFT_TYPE_CATEGORY_OPTIONS,
  SHIFT_TYPE_CODE_PREFIX,
  SHIFT_TYPE_STATUSES,
  type GetShiftTypesParams,
  type ShiftTypeHistoryEntry,
  type ShiftTypePayload,
  type ShiftTypeRecord,
  type ShiftTypeStatus,
  type ShiftTypeSummary
} from '@/types/roster';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const hhmmSchema = z
  .string()
  .min(1, 'Time is required')
  .transform(normalizeShiftTime)
  .refine((value) => TIME_PATTERN.test(value), {
    message: 'Time must be HH:mm'
  });

const optionalChipLabel = z
  .string()
  .max(12, 'Must be less than 12 characters')
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

const shiftTypePayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters'),
  category: z.enum(SHIFT_TYPE_CATEGORIES),
  chipLabel: optionalChipLabel,
  startTime: hhmmSchema,
  endTime: hhmmSchema,
  breakMinutes: z.coerce.number().int().min(0).optional().default(0),
  graceMinutes: z.coerce.number().int().min(0).optional().default(0),
  lateThresholdMinutes: z.coerce.number().int().min(0).optional().default(0),
  earlyExitThresholdMinutes: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0),
  isNightShift: z.boolean().optional().default(false),
  isOvernight: z.boolean().optional().default(false),
  holidayEligible: z.boolean().optional().default(false),
  status: z.enum(SHIFT_TYPE_STATUSES).optional().default('active')
});

const shiftTypeUpdatePayloadSchema = shiftTypePayloadSchema.partial().extend({
  id: z.string().min(1, 'Shift type ID is required'),
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

function resolveCategoryFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const byId = SHIFT_TYPE_CATEGORY_OPTIONS.find(
    (option) => option.id === value
  );
  if (byId) return byId.name;
  if ((SHIFT_TYPE_CATEGORIES as readonly string[]).includes(value)) {
    return value;
  }
  return undefined;
}

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapShiftTypeRecord(record: any): ShiftTypeRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    category: record.category ?? '',
    chipLabel: record.chipLabel ?? null,
    startTime: record.startTime,
    endTime: record.endTime,
    breakMinutes: Number(record.breakMinutes ?? 0),
    durationHours: Number(record.durationHours ?? 0),
    graceMinutes: Number(record.graceMinutes ?? 0),
    lateThresholdMinutes: Number(record.lateThresholdMinutes ?? 0),
    earlyExitThresholdMinutes: Number(record.earlyExitThresholdMinutes ?? 0),
    isNightShift: Boolean(record.isNightShift),
    isOvernight: Boolean(record.isOvernight),
    holidayEligible: Boolean(record.holidayEligible),
    status: (record.status as ShiftTypeStatus) ?? 'active',
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    createdUser: record.createdUser ?? null,
    updatedUser: record.updatedUser ?? null
  };
}

function buildShiftTypeWhere(
  params: GetShiftTypesParams
): Prisma.ShiftTypeWhereInput {
  const where: Prisma.ShiftTypeWhereInput = {};
  const and: Prisma.ShiftTypeWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [{ name: { contains: search } }, { code: { contains: search } }]
    });
  }

  const code = params.code?.trim();
  if (code) {
    and.push({ code: { contains: code } });
  }

  const name = params.name?.trim();
  if (name) {
    and.push({ name: { contains: name } });
  }

  const category = resolveCategoryFilter(params.category);
  if (category) where.category = category;

  if (params.status && params.status !== '__all__') {
    if ((SHIFT_TYPE_STATUSES as readonly string[]).includes(params.status)) {
      where.status = params.status;
    }
  }

  const nightShift = parseYesNoFilter(params.nightShift);
  if (nightShift !== undefined) where.isNightShift = nightShift;

  const overnight = parseYesNoFilter(params.overnight);
  if (overnight !== undefined) where.isOvernight = overnight;

  const holidayEligible = parseYesNoFilter(params.holidayEligible);
  if (holidayEligible !== undefined) where.holidayEligible = holidayEligible;

  if (and.length) {
    where.AND = and;
  }

  return where;
}

function durationFromParsed(data: {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isOvernight: boolean;
}): number {
  return calcTotalWorkingHours(
    data.startTime,
    data.endTime,
    data.breakMinutes,
    data.isOvernight
  );
}

export async function getShiftTypes(params: GetShiftTypesParams): Promise<{
  success: boolean;
  data?: { records: ShiftTypeRecord[]; totalRecords: number };
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
    const where = buildShiftTypeWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.shiftType.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.shiftType.count({ where })
    ]);

    const recordsWithUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: recordsWithUsers.map(mapShiftTypeRecord),
        totalRecords
      },
      message: 'Shift types fetched successfully'
    };
  } catch (error: any) {
    console.error('getShiftTypes error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch shift types' }
    };
  }
}

export async function getShiftTypesForExport(
  params: Omit<GetShiftTypesParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: ShiftTypeRecord[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const where = buildShiftTypeWhere(params);
    const exportLimit =
      Number.parseInt(process.env.EXPORT_LIMIT ?? '1000', 10) || 1000;
    const records = await prisma.shiftType.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: exportLimit
    });
    const recordsWithUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: recordsWithUsers.map(mapShiftTypeRecord),
      message: 'Shift types export fetched successfully'
    };
  } catch (error: any) {
    console.error('getShiftTypesForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export shift types' }
    };
  }
}

export async function getShiftTypeById(id: string): Promise<{
  success: boolean;
  data?: ShiftTypeRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid shift type ID' } };
    }

    const shiftType = await prisma.shiftType.findUnique({ where: { id } });
    if (!shiftType) {
      return { success: false, error: { message: 'Shift type not found' } };
    }

    const [record] = await resolveAuthUsers([shiftType]);
    return {
      success: true,
      data: mapShiftTypeRecord(record),
      message: 'Shift type fetched successfully'
    };
  } catch (error: any) {
    console.error('getShiftTypeById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get shift type' }
    };
  }
}

export async function getShiftTypeSummary(): Promise<{
  success: boolean;
  data?: ShiftTypeSummary;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const [total, active, nightOrOvernight, holidayEligible, categoryRows] =
      await Promise.all([
        prisma.shiftType.count(),
        prisma.shiftType.count({ where: { status: 'active' } }),
        prisma.shiftType.count({
          where: {
            OR: [{ isNightShift: true }, { isOvernight: true }]
          }
        }),
        prisma.shiftType.count({ where: { holidayEligible: true } }),
        prisma.shiftType.findMany({
          select: { category: true }
        })
      ]);

    const categories = new Set(
      categoryRows.map((row) => row.category).filter(Boolean)
    ).size;

    return {
      success: true,
      data: {
        total,
        active,
        nightOrOvernight,
        holidayEligible,
        categories
      },
      message: 'Shift type summary fetched'
    };
  } catch (error: any) {
    console.error('getShiftTypeSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch shift type summary' }
    };
  }
}

const HISTORY_TITLES: Record<string, string> = {
  'shift.shiftType.created': 'Shift type created',
  'shift.shiftType.updated': 'Shift type updated',
  'shift.shiftType.deleted': 'Shift type deleted',
  'shift.shiftType.activated': 'Shift type activated'
};

export async function getShiftTypeHistory(id: string): Promise<{
  success: boolean;
  data?: ShiftTypeHistoryEntry[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid shift type ID' } };
    }

    const logs = await prisma.activityLog.findMany({
      where: { entityType: 'ShiftType', entityId: id },
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

    return {
      success: true,
      data: withUsers.map((log) => {
        const metadata = (log.metadata ?? {}) as {
          code?: string;
          name?: string;
        };
        const code = metadata.code ? ` (${metadata.code})` : '';
        const name = metadata.name ? metadata.name : 'Shift type';
        return {
          id: log.id,
          title: HISTORY_TITLES[log.action] ?? 'Shift type change',
          detail: `${name}${code}.`,
          userLabel: log.createdUser?.name ?? '—',
          at: toIsoString(log.createdAt)
        };
      }),
      message: 'Shift type history fetched'
    };
  } catch (error: any) {
    console.error('getShiftTypeHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch shift type history' }
    };
  }
}

export async function createShiftType(
  payload: ShiftTypePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ShiftTypeRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = shiftTypePayloadSchema.safeParse(payload);
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
    const generated = await generateRecordCode(SHIFT_TYPE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate shift type code. Please try again.'
        }
      };
    }

    const shiftType = await prisma.shiftType.create({
      data: {
        code: generated.code,
        name: data.name,
        category: data.category,
        chipLabel: data.chipLabel,
        startTime: data.startTime,
        endTime: data.endTime,
        breakMinutes: data.breakMinutes,
        durationHours: durationFromParsed(data),
        graceMinutes: data.graceMinutes,
        lateThresholdMinutes: data.lateThresholdMinutes,
        earlyExitThresholdMinutes: data.earlyExitThresholdMinutes,
        isNightShift: data.isNightShift,
        isOvernight: data.isOvernight,
        holidayEligible: data.holidayEligible,
        status: data.status,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    return {
      success: true,
      data: mapShiftTypeRecord(shiftType),
      message: 'Shift type created successfully'
    };
  } catch (error: any) {
    console.error('createShiftType error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { code: ['Shift type code already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create shift type' }
    };
  }
}

export async function updateShiftType(
  id: string,
  payload: Partial<ShiftTypePayload>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ShiftTypeRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = shiftTypeUpdatePayloadSchema.safeParse({ ...payload, id });
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
    const existing = await prisma.shiftType.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: { message: 'Shift type not found' } };
    }

    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;
    const breakMinutes = data.breakMinutes ?? existing.breakMinutes;
    const isOvernight = data.isOvernight ?? existing.isOvernight;

    const shiftType = await prisma.shiftType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.chipLabel !== undefined && { chipLabel: data.chipLabel }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.breakMinutes !== undefined && {
          breakMinutes: data.breakMinutes
        }),
        durationHours: calcTotalWorkingHours(
          startTime,
          endTime,
          breakMinutes,
          isOvernight
        ),
        ...(data.graceMinutes !== undefined && {
          graceMinutes: data.graceMinutes
        }),
        ...(data.lateThresholdMinutes !== undefined && {
          lateThresholdMinutes: data.lateThresholdMinutes
        }),
        ...(data.earlyExitThresholdMinutes !== undefined && {
          earlyExitThresholdMinutes: data.earlyExitThresholdMinutes
        }),
        ...(data.isNightShift !== undefined && {
          isNightShift: data.isNightShift
        }),
        ...(data.isOvernight !== undefined && {
          isOvernight: data.isOvernight
        }),
        ...(data.holidayEligible !== undefined && {
          holidayEligible: data.holidayEligible
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    return {
      success: true,
      data: mapShiftTypeRecord(shiftType),
      message: 'Shift type updated successfully'
    };
  } catch (error: any) {
    console.error('updateShiftType error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { code: ['Shift type code already exists'] }
        }
      };
    }
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Shift type not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update shift type' }
    };
  }
}

async function assertShiftTypeDeletable(id: string): Promise<string | null> {
  const [assignmentCount, allocationCount, amendmentCount] = await Promise.all([
    prisma.staffShiftAssignment.count({ where: { shiftTypeId: id } }),
    prisma.rosterAllocation.count({ where: { shiftTypeId: id } }),
    prisma.rosterAmendment.count({
      where: {
        OR: [{ originalShiftTypeId: id }, { amendedShiftTypeId: id }]
      }
    })
  ]);

  if (assignmentCount > 0 || allocationCount > 0 || amendmentCount > 0) {
    return 'Cannot delete a shift type that is used by assignments, allocations, or amendments.';
  }

  return null;
}

export async function deleteShiftType(id: string): Promise<{
  success: boolean;
  data?: { id: string };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const blocked = await assertShiftTypeDeletable(id);
    if (blocked) {
      return { success: false, error: { message: blocked } };
    }

    await prisma.shiftType.delete({ where: { id } });
    return {
      success: true,
      data: { id },
      message: 'Shift type deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteShiftType error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Shift type not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to delete shift type' }
    };
  }
}

export async function deleteShiftTypes(ids: string[]): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!ids?.length) {
      return {
        success: false,
        error: { message: 'No shift type IDs provided' }
      };
    }

    const [assignmentCount, allocationCount, amendmentCount] =
      await Promise.all([
        prisma.staffShiftAssignment.count({
          where: { shiftTypeId: { in: ids } }
        }),
        prisma.rosterAllocation.count({
          where: { shiftTypeId: { in: ids } }
        }),
        prisma.rosterAmendment.count({
          where: {
            OR: [
              { originalShiftTypeId: { in: ids } },
              { amendedShiftTypeId: { in: ids } }
            ]
          }
        })
      ]);

    if (assignmentCount > 0 || allocationCount > 0 || amendmentCount > 0) {
      return {
        success: false,
        error: {
          message:
            'Cannot delete shift types that are used by assignments, allocations, or amendments.'
        }
      };
    }

    const result = await prisma.shiftType.deleteMany({
      where: { id: { in: ids } }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: { message: 'No shift types found to delete' }
      };
    }

    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} shift type(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('deleteShiftTypes error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete shift types' }
    };
  }
}

export async function activateShiftTypes(ids: string[]): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!ids?.length) {
      return {
        success: false,
        error: { message: 'No shift type IDs provided' }
      };
    }

    const result = await prisma.shiftType.updateMany({
      where: { id: { in: ids } },
      data: { status: 'active' }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: { message: 'No shift types found to activate' }
      };
    }

    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} shift type(s) activated`
    };
  } catch (error: any) {
    console.error('activateShiftTypes error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to activate shift types' }
    };
  }
}
