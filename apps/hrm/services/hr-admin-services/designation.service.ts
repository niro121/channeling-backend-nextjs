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
  DESIGNATION_CODE_PREFIX,
  DESIGNATION_CATEGORIES,
  type GetDesignationParams,
  type DesignationPayload,
  type DesignationServiceRecord
} from '@/types/designation';

const designationPayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  categoryId: z.enum(DESIGNATION_CATEGORIES),
  description: z
    .string()
    .max(200, 'Must be less than 200 characters')
    .optional()
    .default('')
    .transform((value) => value.trim())
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
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): DesignationServiceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    categoryId: record.categoryId,
    description: record.description,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null,
    staffCount: 0
  };
}

function buildWhere(
  params: GetDesignationParams
): Prisma.DesignationWhereInput {
  const where: Prisma.DesignationWhereInput = {};
  const and: Prisma.DesignationWhereInput[] = [];

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

const designationSelect = {
  id: true,
  code: true,
  name: true,
  categoryId: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

export async function getDesignationList(
  params: GetDesignationParams = {}
): Promise<{
  success: boolean;
  data?: DesignationServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.designation.findMany({
      where: buildWhere(params),
      select: designationSelect,
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
    console.error('getDesignationList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch designations' }
    };
  }
}

export async function getDesignationById(id: string): Promise<{
  success: boolean;
  data?: DesignationServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid designation ID' } };
    }

    const record = await prisma.designation.findUnique({
      where: { id },
      select: designationSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Designation not found' } };
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
    console.error('getDesignationById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get designation' }
    };
  }
}

async function findDuplicateName(
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.designation.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

export async function createDesignation(
  payload: DesignationPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: DesignationServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = designationPayloadSchema.safeParse(payload);
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

    const generated = await generateRecordCode(DESIGNATION_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate designation code. Please try again.' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.designation.create({
      data: {
        code: generated.code,
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: designationSelect
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
    console.error('createDesignation error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A designation with this name already exists.',
          issues: { name: ['A designation with this name already exists.'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create designation' }
    };
  }
}

export async function updateDesignation(
  id: string,
  payload: DesignationPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: DesignationServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid designation ID' } };
    }

    const existing = await prisma.designation.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Designation not found' } };
    }

    const parsed = designationPayloadSchema.safeParse(payload);
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
    const updated = await prisma.designation.update({
      where: { id },
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: designationSelect
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
    console.error('updateDesignation error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A designation with this name already exists.',
          issues: { name: ['A designation with this name already exists.'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update designation' }
    };
  }
}

export async function deleteDesignation(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid designation ID' } };
    }

    const existing = await prisma.designation.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Designation not found' } };
    }

    await prisma.designation.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteDesignation error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete designation' }
    };
  }
}
