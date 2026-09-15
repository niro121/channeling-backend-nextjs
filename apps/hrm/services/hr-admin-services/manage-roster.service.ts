'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import {
  MANAGE_ROSTER_DEPARTMENTS,
  type GetManageRosterParams,
  type ManageRosterPayload,
  type ManageRosterServiceRecord
} from '@/types/manage-roster';

const manageRosterPayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  code: z
    .string()
    .min(1, 'Roster code is required')
    .max(12, 'Must be 12 characters or less')
    .transform((value) => value.trim().toUpperCase()),
  departmentId: z.enum(MANAGE_ROSTER_DEPARTMENTS),
  shiftsPerPersonPerDay: z.coerce
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
});

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
    departmentId: string;
    shiftsPerPersonPerDay: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): ManageRosterServiceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    departmentId: record.departmentId,
    shiftsPerPersonPerDay: record.shiftsPerPersonPerDay,
    // Derived counts — Staff / Roster integration deferred (R6/R7)
    assignedStaffCount: 0,
    activeShiftCount: 0,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildWhere(
  params: GetManageRosterParams
): Prisma.ManageRosterWhereInput {
  const where: Prisma.ManageRosterWhereInput = {};
  const and: Prisma.ManageRosterWhereInput[] = [];

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

const manageRosterSelect = {
  id: true,
  code: true,
  name: true,
  departmentId: true,
  shiftsPerPersonPerDay: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

export async function getManageRosterList(
  params: GetManageRosterParams = {}
): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.manageRoster.findMany({
      where: buildWhere(params),
      select: manageRosterSelect,
      orderBy: { name: 'asc' }
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
    console.error('getManageRosterList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch rosters' }
    };
  }
}

export async function getManageRosterById(id: string): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid roster ID' } };
    }

    const record = await prisma.manageRoster.findUnique({
      where: { id },
      select: manageRosterSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Roster not found' } };
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
    console.error('getManageRosterById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get roster' }
    };
  }
}

async function findDuplicateName(
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.manageRoster.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

async function findDuplicateCode(
  code: string,
  excludeId?: string
): Promise<{ id: string; code: string } | null> {
  const existing = await prisma.manageRoster.findFirst({
    where: {
      code: { equals: code, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, code: true }
  });
  return existing;
}

function duplicateFieldError(
  field: 'name' | 'code',
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

export async function createManageRoster(
  payload: ManageRosterPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = manageRosterPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const duplicateName = await findDuplicateName(parsed.data.name);
    if (duplicateName) {
      return duplicateFieldError(
        'name',
        `"${duplicateName.name}" already exists.`
      );
    }

    const duplicateCode = await findDuplicateCode(parsed.data.code);
    if (duplicateCode) {
      return duplicateFieldError(
        'code',
        `Roster code "${duplicateCode.code}" already exists.`
      );
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.manageRoster.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        departmentId: parsed.data.departmentId,
        shiftsPerPersonPerDay: parsed.data.shiftsPerPersonPerDay,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: manageRosterSelect
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
    console.error('createManageRoster error:', error);
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('code')) {
        return duplicateFieldError(
          'code',
          'A roster with this code already exists.'
        );
      }
      return duplicateFieldError(
        'name',
        'A roster with this name already exists.'
      );
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create roster' }
    };
  }
}

export async function updateManageRoster(
  id: string,
  payload: ManageRosterPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid roster ID' } };
    }

    const existing = await prisma.manageRoster.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Roster not found' } };
    }

    const parsed = manageRosterPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const duplicateName = await findDuplicateName(parsed.data.name, id);
    if (duplicateName) {
      return duplicateFieldError(
        'name',
        `"${duplicateName.name}" already exists.`
      );
    }

    const duplicateCode = await findDuplicateCode(parsed.data.code, id);
    if (duplicateCode) {
      return duplicateFieldError(
        'code',
        `Roster code "${duplicateCode.code}" already exists.`
      );
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.manageRoster.update({
      where: { id },
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        departmentId: parsed.data.departmentId,
        shiftsPerPersonPerDay: parsed.data.shiftsPerPersonPerDay,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: manageRosterSelect
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
    console.error('updateManageRoster error:', error);
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('code')) {
        return duplicateFieldError(
          'code',
          'A roster with this code already exists.'
        );
      }
      return duplicateFieldError(
        'name',
        'A roster with this name already exists.'
      );
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update roster' }
    };
  }
}

export async function deleteManageRoster(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid roster ID' } };
    }

    const existing = await prisma.manageRoster.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Roster not found' } };
    }

    await prisma.manageRoster.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteManageRoster error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete roster' }
    };
  }
}
