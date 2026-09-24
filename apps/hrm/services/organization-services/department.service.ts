'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import type {
  DepartmentPayload,
  DepartmentServiceRecord,
  GetDepartmentParams
} from '@/types/department';

const departmentPayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Department name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  description: z
    .string()
    .max(500, 'Must be less than 500 characters')
    .optional()
    .default('')
    .transform((value) => value.trim()),
  institution: z
    .number()
    .int()
    .min(0)
    .max(3),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    })
});

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapServiceRecord(
  record: {
    id: string;
    name: string;
    description: string;
    institution: number;
    status: number;
    migrateSourceId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): DepartmentServiceRecord {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    institution: record.institution,
    status: record.status,
    migrateSourceId: record.migrateSourceId,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildWhere(params: GetDepartmentParams): Prisma.DepartmentWhereInput {
  const where: Prisma.DepartmentWhereInput = {};
  const and: Prisma.DepartmentWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (params.status === '0' || params.status === '1') {
    and.push({ status: Number.parseInt(params.status, 10) });
  }

  if (params.institution != null && params.institution !== '') {
    const institution = Number.parseInt(params.institution, 10);
    if (Number.isFinite(institution) && institution >= 0 && institution <= 3) {
      and.push({ institution });
    }
  }

  if (and.length) where.AND = and;
  return where;
}

const departmentSelect = {
  id: true,
  name: true,
  description: true,
  institution: true,
  status: true,
  migrateSourceId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

export async function getDepartmentList(
  params: GetDepartmentParams = {}
): Promise<{
  success: boolean;
  data?: DepartmentServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.department.findMany({
      where: buildWhere(params),
      select: departmentSelect,
      orderBy: [{ name: 'asc' }]
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
    console.error('getDepartmentList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch departments' }
    };
  }
}

export async function getDepartmentById(id: string): Promise<{
  success: boolean;
  data?: DepartmentServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid department ID' } };
    }

    const record = await prisma.department.findUnique({
      where: { id },
      select: departmentSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Department not found' } };
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
    console.error('getDepartmentById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get department' }
    };
  }
}

async function findDuplicateNamePerInstitution(
  name: string,
  institution: number,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.department.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      institution,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

export async function createDepartment(
  payload: DepartmentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: DepartmentServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = departmentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const duplicate = await findDuplicateNamePerInstitution(
      parsed.data.name,
      parsed.data.institution
    );
    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'Department name already exists for this institution',
          issues: {
            name: ['Department name already exists for this institution']
          }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.department.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        institution: parsed.data.institution,
        status: parsed.data.status,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: departmentSelect
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
    console.error('createDepartment error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Department name already exists for this institution',
          issues: {
            name: ['Department name already exists for this institution']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create department' }
    };
  }
}

export async function updateDepartment(
  id: string,
  payload: DepartmentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: DepartmentServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid department ID' } };
    }

    const existing = await prisma.department.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Department not found' } };
    }

    const parsed = departmentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const duplicate = await findDuplicateNamePerInstitution(
      parsed.data.name,
      parsed.data.institution,
      id
    );
    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'Department name already exists for this institution',
          issues: {
            name: ['Department name already exists for this institution']
          }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        institution: parsed.data.institution,
        status: parsed.data.status,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: departmentSelect
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
    console.error('updateDepartment error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Department name already exists for this institution',
          issues: {
            name: ['Department name already exists for this institution']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update department' }
    };
  }
}

export async function deleteDepartment(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid department ID' } };
    }

    const existing = await prisma.department.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Department not found' } };
    }

    await prisma.department.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteDepartment error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete department' }
    };
  }
}

export async function setDepartmentMigrateSourceId(
  id: string,
  migrateSourceId: string
): Promise<{ success: boolean; error?: { message?: string } }> {
  try {
    await prisma.department.update({
      where: { id },
      data: { migrateSourceId }
    });
    return { success: true };
  } catch (error: any) {
    console.error('setDepartmentMigrateSourceId error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to link Channeling department' }
    };
  }
}
