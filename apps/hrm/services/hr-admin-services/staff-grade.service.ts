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
  STAFF_GRADE_CODE_PREFIX,
  STAFF_GRADE_LEVELS,
  type GetStaffGradeParams,
  type StaffGradePayload,
  type StaffGradeServiceRecord
} from '@/types/staff-grade';

const staffGradePayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  gradeLevelId: z.enum(STAFF_GRADE_LEVELS)
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
    gradeLevelId: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): StaffGradeServiceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    gradeLevelId: record.gradeLevelId,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildWhere(
  params: GetStaffGradeParams
): Prisma.StaffGradeWhereInput {
  const where: Prisma.StaffGradeWhereInput = {};
  const and: Prisma.StaffGradeWhereInput[] = [];

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

const staffGradeSelect = {
  id: true,
  code: true,
  name: true,
  gradeLevelId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

export async function getStaffGradeList(
  params: GetStaffGradeParams = {}
): Promise<{
  success: boolean;
  data?: StaffGradeServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.staffGrade.findMany({
      where: buildWhere(params),
      select: staffGradeSelect,
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
    console.error('getStaffGradeList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch staff grades' }
    };
  }
}

export async function getStaffGradeById(id: string): Promise<{
  success: boolean;
  data?: StaffGradeServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid staff grade ID' } };
    }

    const record = await prisma.staffGrade.findUnique({
      where: { id },
      select: staffGradeSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Staff grade not found' } };
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
    console.error('getStaffGradeById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get staff grade' }
    };
  }
}

async function findDuplicateName(
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.staffGrade.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

export async function createStaffGrade(
  payload: StaffGradePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: StaffGradeServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffGradePayloadSchema.safeParse(payload);
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

    const generated = await generateRecordCode(STAFF_GRADE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate staff grade code. Please try again.' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.staffGrade.create({
      data: {
        code: generated.code,
        name: parsed.data.name,
        gradeLevelId: parsed.data.gradeLevelId,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: staffGradeSelect
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
    console.error('createStaffGrade error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A staff grade with this name already exists.',
          issues: { name: ['A staff grade with this name already exists.'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create staff grade' }
    };
  }
}

export async function updateStaffGrade(
  id: string,
  payload: StaffGradePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: StaffGradeServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid staff grade ID' } };
    }

    const existing = await prisma.staffGrade.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Staff grade not found' } };
    }

    const parsed = staffGradePayloadSchema.safeParse(payload);
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
    const updated = await prisma.staffGrade.update({
      where: { id },
      data: {
        name: parsed.data.name,
        gradeLevelId: parsed.data.gradeLevelId,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: staffGradeSelect
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
    console.error('updateStaffGrade error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A staff grade with this name already exists.',
          issues: { name: ['A staff grade with this name already exists.'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update staff grade' }
    };
  }
}

export async function deleteStaffGrade(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid staff grade ID' } };
    }

    const existing = await prisma.staffGrade.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Staff grade not found' } };
    }

    await prisma.staffGrade.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteStaffGrade error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete staff grade' }
    };
  }
}
