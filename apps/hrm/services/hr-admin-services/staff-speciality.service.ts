'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  STAFF_SPECIALITY_CATEGORIES,
  STAFF_SPECIALITY_CODE_PREFIX,
  type GetStaffSpecialityParams,
  type StaffSpecialityOption,
  type StaffSpecialityPayload,
  type StaffSpecialityServiceRecord
} from '@/types/staff-speciality';

const staffSpecialityPayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  categoryId: z.enum(STAFF_SPECIALITY_CATEGORIES),
  description: z
    .string()
    .max(200, 'Must be less than 200 characters')
    .optional()
    .default('')
    .transform((value) => value.trim()),
  status: z.coerce.number().int().refine((value) => value === 0 || value === 1, {
    message: 'Status must be Active or Inactive'
  }),
  sortOrder: z.coerce
    .number()
    .int('Sort order must be a whole number')
    .min(0, 'Sort order cannot be negative')
    .max(9999, 'Sort order must be less than 10000')
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
    categoryId: string;
    description: string;
    status: number;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  },
  staffCount = 0
): StaffSpecialityServiceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    categoryId: record.categoryId,
    description: record.description,
    status: record.status,
    sortOrder: record.sortOrder,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null,
    staffCount
  };
}

function buildWhere(
  params: GetStaffSpecialityParams
): Prisma.StaffSpecialityWhereInput {
  const where: Prisma.StaffSpecialityWhereInput = {};
  const and: Prisma.StaffSpecialityWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (params.activeOnly) {
    const includeIds = (params.includeIds ?? []).filter(Boolean);
    if (includeIds.length) {
      and.push({
        OR: [{ status: 1 }, { id: { in: includeIds } }]
      });
    } else {
      and.push({ status: 1 });
    }
  }

  if (and.length) where.AND = and;
  return where;
}

const staffSpecialitySelect = {
  id: true,
  code: true,
  name: true,
  categoryId: true,
  description: true,
  status: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

async function countStaffUsingSpeciality(specialityId: string): Promise<number> {
  return prisma.staff.count({
    where: {
      hrDetails: {
        is: {
          specialityIds: { has: specialityId }
        }
      }
    }
  });
}

export async function getStaffSpecialityList(
  params: GetStaffSpecialityParams = {}
): Promise<{
  success: boolean;
  data?: StaffSpecialityServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.staffSpeciality.findMany({
      where: buildWhere(params),
      select: staffSpecialitySelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: withUsers.map((record) =>
        mapServiceRecord(
          record,
          {
            createdUser: record.createdUser,
            updatedUser: record.updatedUser
          },
          0
        )
      )
    };
  } catch (error: any) {
    console.error('getStaffSpecialityList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch staff specialities' }
    };
  }
}

export async function getStaffSpecialityOptions(
  params: GetStaffSpecialityParams = {}
): Promise<{
  success: boolean;
  data?: StaffSpecialityOption[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.staffSpeciality.findMany({
      where: buildWhere({
        activeOnly: params.activeOnly ?? true,
        includeIds: params.includeIds
      }),
      select: { id: true, name: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    return {
      success: true,
      data: records.map((record) => ({ id: record.id, name: record.name }))
    };
  } catch (error: any) {
    console.error('getStaffSpecialityOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch speciality options' }
    };
  }
}

export async function getStaffSpecialityById(id: string): Promise<{
  success: boolean;
  data?: StaffSpecialityServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid speciality ID' } };
    }

    const record = await prisma.staffSpeciality.findUnique({
      where: { id },
      select: staffSpecialitySelect
    });
    if (!record) {
      return { success: false, error: { message: 'Staff speciality not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    const staffCount = await countStaffUsingSpeciality(id);
    return {
      success: true,
      data: mapServiceRecord(
        withUsers,
        {
          createdUser: withUsers.createdUser,
          updatedUser: withUsers.updatedUser
        },
        staffCount
      )
    };
  } catch (error: any) {
    console.error('getStaffSpecialityById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get staff speciality' }
    };
  }
}

async function findDuplicateName(
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.staffSpeciality.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

export async function createStaffSpeciality(
  payload: StaffSpecialityPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: StaffSpecialityServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffSpecialityPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const duplicate = await findDuplicateName(parsed.data.name);
    if (duplicate) {
      return {
        success: false,
        error: {
          message: `"${duplicate.name}" already exists.`,
          issues: { name: [`"${duplicate.name}" already exists.`] }
        }
      };
    }

    const generated = await generateRecordCode(STAFF_SPECIALITY_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate speciality code. Please try again.'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.staffSpeciality.create({
      data: {
        code: generated.code,
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        status: parsed.data.status,
        sortOrder: parsed.data.sortOrder,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: staffSpecialitySelect
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
    console.error('createStaffSpeciality error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A staff speciality with this name already exists.',
          issues: {
            name: ['A staff speciality with this name already exists.']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create staff speciality' }
    };
  }
}

export async function updateStaffSpeciality(
  id: string,
  payload: StaffSpecialityPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: StaffSpecialityServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid speciality ID' } };
    }

    const existing = await prisma.staffSpeciality.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Staff speciality not found' } };
    }

    const parsed = staffSpecialityPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const duplicate = await findDuplicateName(parsed.data.name, id);
    if (duplicate) {
      return {
        success: false,
        error: {
          message: `"${duplicate.name}" already exists.`,
          issues: { name: [`"${duplicate.name}" already exists.`] }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.staffSpeciality.update({
      where: { id },
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        status: parsed.data.status,
        sortOrder: parsed.data.sortOrder,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: staffSpecialitySelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    const staffCount = await countStaffUsingSpeciality(id);
    return {
      success: true,
      data: mapServiceRecord(
        withUsers,
        {
          createdUser: withUsers.createdUser,
          updatedUser: withUsers.updatedUser
        },
        staffCount
      )
    };
  } catch (error: any) {
    console.error('updateStaffSpeciality error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A staff speciality with this name already exists.',
          issues: {
            name: ['A staff speciality with this name already exists.']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update staff speciality' }
    };
  }
}

export async function deleteStaffSpeciality(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid speciality ID' } };
    }

    const existing = await prisma.staffSpeciality.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Staff speciality not found' } };
    }

    const staffCount = await countStaffUsingSpeciality(id);
    if (staffCount > 0) {
      return {
        success: false,
        error: {
          message: `"${existing.name}" is assigned to ${staffCount} staff member(s) and cannot be deleted.`
        }
      };
    }

    await prisma.staffSpeciality.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteStaffSpeciality error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete staff speciality' }
    };
  }
}
