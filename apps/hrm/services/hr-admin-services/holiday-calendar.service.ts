'use server';

import { parseISO } from 'date-fns';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import { holidayTypeLabel } from '@/lib/helpers/holiday-type.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { HOLIDAY_CALENDAR_CODE_PREFIX } from '@/types/roster';
import {
  HOLIDAY_TYPES,
  type GetHolidayCalendarParams,
  type HolidayCalendarPayload,
  type HolidayCalendarServiceRecord
} from '@/types/holiday-calendar';

const holidayPayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  typeId: z.enum(HOLIDAY_TYPES),
  date: z.coerce.date()
});

function startOfDayUtc(value: Date | string): Date {
  const raw =
    value instanceof Date ? value : parseISO(String(value).slice(0, 10));
  return new Date(
    Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate())
  );
}

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapServiceRecord(
  record: {
    id: string;
    code: string;
    name: string;
    typeId: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    _count?: { allocations: number };
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): HolidayCalendarServiceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    typeId: record.typeId,
    date: toIsoString(record.date),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null,
    allocationCount: record._count?.allocations ?? 0
  };
}

function buildWhere(
  params: GetHolidayCalendarParams
): Prisma.HolidayCalendarWhereInput {
  const where: Prisma.HolidayCalendarWhereInput = {};
  const and: Prisma.HolidayCalendarWhereInput[] = [];

  const year =
    params.year !== undefined && params.year !== ''
      ? Number.parseInt(String(params.year), 10)
      : undefined;
  if (year && !Number.isNaN(year)) {
    and.push({
      date: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1))
      }
    });
  }

  if (params.fromDate) {
    and.push({ date: { gte: startOfDayUtc(params.fromDate) } });
  }
  if (params.toDate) {
    and.push({ date: { lte: startOfDayUtc(params.toDate) } });
  }

  if (params.typeId && params.typeId !== '__all__') {
    where.typeId = params.typeId;
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (and.length) where.AND = and;
  return where;
}

const holidaySelect = {
  id: true,
  code: true,
  name: true,
  typeId: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  _count: { select: { allocations: true } }
} as const;

export async function getHolidayCalendarList(
  params: GetHolidayCalendarParams = {}
): Promise<{
  success: boolean;
  data?: HolidayCalendarServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.holidayCalendar.findMany({
      where: buildWhere(params),
      select: holidaySelect,
      orderBy: { date: 'asc' }
    });

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: withUsers.map((record) =>
        mapServiceRecord(record, {
          createdUser: record.createdUser,
          updatedUser: record.updatedUser
        })
      )
    };
  } catch (error: any) {
    console.error('getHolidayCalendarList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch holidays' }
    };
  }
}

export async function getHolidayCalendarById(id: string): Promise<{
  success: boolean;
  data?: HolidayCalendarServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid holiday ID' } };
    }

    const record = await prisma.holidayCalendar.findUnique({
      where: { id },
      select: holidaySelect
    });
    if (!record) {
      return { success: false, error: { message: 'Holiday not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('getHolidayCalendarById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get holiday' }
    };
  }
}

export async function getHolidayCalendarFormOptions(): Promise<{
  success: boolean;
  data?: { holidayTypes: { id: string; name: string }[] };
  error?: { message?: string };
}> {
  return {
    success: true,
    data: {
      holidayTypes: HOLIDAY_TYPES.map((id) => ({
        id,
        name: holidayTypeLabel(id)
      }))
    }
  };
}

async function findDuplicateDate(
  date: Date,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.holidayCalendar.findFirst({
    where: {
      date,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

export async function createHolidayCalendar(
  payload: HolidayCalendarPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: HolidayCalendarServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = holidayPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const date = startOfDayUtc(parsed.data.date);
    const duplicate = await findDuplicateDate(date);
    if (duplicate) {
      return {
        success: false,
        error: {
          message: `"${duplicate.name}" already uses this date.`,
          issues: { date: [`"${duplicate.name}" already uses this date.`] }
        }
      };
    }

    const generated = await generateRecordCode(HOLIDAY_CALENDAR_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate holiday code. Please try again.' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.holidayCalendar.create({
      data: {
        code: generated.code,
        name: parsed.data.name,
        typeId: parsed.data.typeId,
        date,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: holidaySelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('createHolidayCalendar error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A holiday already exists for this date.',
          issues: { date: ['A holiday already exists for this date.'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create holiday' }
    };
  }
}

export async function updateHolidayCalendar(
  id: string,
  payload: HolidayCalendarPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: HolidayCalendarServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid holiday ID' } };
    }

    const existing = await prisma.holidayCalendar.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Holiday not found' } };
    }

    const parsed = holidayPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const date = startOfDayUtc(parsed.data.date);
    const duplicate = await findDuplicateDate(date, id);
    if (duplicate) {
      return {
        success: false,
        error: {
          message: `"${duplicate.name}" already uses this date.`,
          issues: { date: [`"${duplicate.name}" already uses this date.`] }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.holidayCalendar.update({
      where: { id },
      data: {
        name: parsed.data.name,
        typeId: parsed.data.typeId,
        date,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: holidaySelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('updateHolidayCalendar error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A holiday already exists for this date.',
          issues: { date: ['A holiday already exists for this date.'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update holiday' }
    };
  }
}

export async function deleteHolidayCalendar(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid holiday ID' } };
    }

    const existing = await prisma.holidayCalendar.findUnique({
      where: { id },
      select: {
        id: true,
        _count: { select: { allocations: true } }
      }
    });
    if (!existing) {
      return { success: false, error: { message: 'Holiday not found' } };
    }

    const allocationCount = existing._count.allocations;
    if (allocationCount > 0) {
      return {
        success: false,
        error: {
          message: `Cannot delete — ${allocationCount} public holiday shift(s) reference this date.`
        }
      };
    }

    await prisma.holidayCalendar.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteHolidayCalendar error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete holiday' }
    };
  }
}

/** Thin options list for Roster Public Holiday Shifts forms/filters. */
export async function listHolidaysForOptions(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    typeId: string;
    date: string;
  }>;
  error?: { message?: string };
}> {
  try {
    const holidays = await prisma.holidayCalendar.findMany({
      orderBy: { date: 'desc' },
      select: { id: true, name: true, typeId: true, date: true }
    });
    return {
      success: true,
      data: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        typeId: h.typeId,
        date: toIsoString(h.date)
      }))
    };
  } catch (error: any) {
    console.error('listHolidaysForOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load holidays' }
    };
  }
}
