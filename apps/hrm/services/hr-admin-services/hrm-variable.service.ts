'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import {
  HRM_VARIABLE_SINGLETON_KEY,
  type HrmPayeSlabPayload,
  type HrmPayeSlabServiceRecord,
  type HrmStatutoryRatesPayload,
  type HrmVariableServiceRecord
} from '@/types/hrm-variable';

const rateSchema = z.coerce
  .number()
  .min(0, 'Rate must be at least 0')
  .max(100, 'Rate must be at most 100');

const statutoryRatesSchema = z.object({
  epfEmployee: rateSchema,
  epfCompany: rateSchema,
  etfEmployee: rateSchema,
  etfCompany: rateSchema
});

const payeSlabSchema = z
  .object({
    fromSalary: z.coerce.number().min(0, 'From salary must be at least 0'),
    toSalary: z.coerce.number().min(0).nullable().optional(),
    taxRate: rateSchema
  })
  .superRefine((data, ctx) => {
    if (data.toSalary != null && data.toSalary <= data.fromSalary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toSalary'],
        message: 'To salary must be greater than From salary'
      });
    }
  });

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function validationError(issues: Record<string, string[]>) {
  return {
    success: false as const,
    error: { message: 'Validation failed', issues }
  };
}

function zodIssues(
  error: z.ZodError
): Record<string, string[]> {
  const issues: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!issues[key]) issues[key] = [];
    issues[key].push(issue.message);
  }
  return issues;
}

function rangesOverlap(
  a: { fromSalary: number; toSalary: number | null },
  b: { fromSalary: number; toSalary: number | null }
): boolean {
  const aHi = a.toSalary ?? Number.POSITIVE_INFINITY;
  const bHi = b.toSalary ?? Number.POSITIVE_INFINITY;
  return a.fromSalary <= bHi && b.fromSalary <= aHi;
}

function mapSlab(record: {
  id: string;
  fromSalary: number;
  toSalary: number | null;
  taxRate: number;
  sortOrder: number;
}): HrmPayeSlabServiceRecord {
  return {
    id: record.id,
    fromSalary: record.fromSalary,
    toSalary: record.toSalary,
    taxRate: record.taxRate,
    sortOrder: record.sortOrder
  };
}

function mapServiceRecord(
  record: {
    id: string;
    key: string;
    epfEmployee: number;
    epfCompany: number;
    etfEmployee: number;
    etfCompany: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    slabs?: Array<{
      id: string;
      fromSalary: number;
      toSalary: number | null;
      taxRate: number;
      sortOrder: number;
    }>;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): HrmVariableServiceRecord {
  const slabs = [...(record.slabs ?? [])].sort(
    (a, b) => a.fromSalary - b.fromSalary || a.sortOrder - b.sortOrder
  );
  return {
    id: record.id,
    key: record.key,
    epfEmployee: record.epfEmployee,
    epfCompany: record.epfCompany,
    etfEmployee: record.etfEmployee,
    etfCompany: record.etfCompany,
    slabs: slabs.map(mapSlab),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

async function attachAuditUsers(
  record: Parameters<typeof mapServiceRecord>[0]
): Promise<HrmVariableServiceRecord> {
  const [withUsers] = await resolveAuthUsers([record]);
  return mapServiceRecord(withUsers, {
    createdUser: withUsers.createdUser,
    updatedUser: withUsers.updatedUser
  });
}

const includeSlabs = {
  slabs: { orderBy: { fromSalary: 'asc' as const } }
};

async function findSingleton() {
  return prisma.hrmVariable.findUnique({
    where: { key: HRM_VARIABLE_SINGLETON_KEY },
    include: includeSlabs
  });
}

async function ensureSingleton(auditUser?: AuditUser) {
  const existing = await findSingleton();
  if (existing) return existing;

  const user = toAuditUser(auditUser);
  return prisma.hrmVariable.create({
    data: {
      key: HRM_VARIABLE_SINGLETON_KEY,
      epfEmployee: 0,
      epfCompany: 0,
      etfEmployee: 0,
      etfCompany: 0,
      createdBy: user?.id,
      updatedBy: user?.id
    },
    include: includeSlabs
  });
}

export async function getHrmVariable(): Promise<{
  success: boolean;
  data?: HrmVariableServiceRecord | null;
  error?: { message: string };
}> {
  try {
    const record = await findSingleton();
    if (!record) {
      return { success: true, data: null };
    }
    return { success: true, data: await attachAuditUsers(record) };
  } catch (error: any) {
    console.error('getHrmVariable error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load HRM variables' }
    };
  }
}

export async function upsertStatutoryRates(
  data: HrmStatutoryRatesPayload,
  auditUser?: AuditUser
): Promise<{
  success: boolean;
  data?: HrmVariableServiceRecord;
  error?: { message: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = statutoryRatesSchema.safeParse(data);
    if (!parsed.success) {
      return validationError(zodIssues(parsed.error));
    }

    const user = toAuditUser(auditUser);
    const existing = await findSingleton();

    const record = existing
      ? await prisma.hrmVariable.update({
          where: { id: existing.id },
          data: {
            ...parsed.data,
            updatedBy: user?.id
          },
          include: includeSlabs
        })
      : await prisma.hrmVariable.create({
          data: {
            key: HRM_VARIABLE_SINGLETON_KEY,
            ...parsed.data,
            createdBy: user?.id,
            updatedBy: user?.id
          },
          include: includeSlabs
        });

    return { success: true, data: await attachAuditUsers(record) };
  } catch (error: any) {
    console.error('upsertStatutoryRates error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to save statutory rates' }
    };
  }
}

export async function createPayeSlab(
  data: HrmPayeSlabPayload,
  auditUser?: AuditUser
): Promise<{
  success: boolean;
  data?: HrmVariableServiceRecord;
  error?: { message: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = payeSlabSchema.safeParse(data);
    if (!parsed.success) {
      return validationError(zodIssues(parsed.error));
    }

    const toSalary =
      parsed.data.toSalary === undefined ? null : parsed.data.toSalary;

    const parent = await ensureSingleton(auditUser);
    const existingSlabs = parent.slabs ?? [];

    if (toSalary == null && existingSlabs.some((s) => s.toSalary == null)) {
      return validationError({
        toSalary: ['Only one open-ended (∞) slab is allowed']
      });
    }

    const next = {
      fromSalary: parsed.data.fromSalary,
      toSalary
    };
    const overlap = existingSlabs.find((s) =>
      rangesOverlap(s, next)
    );
    if (overlap) {
      return validationError({
        fromSalary: ['This range overlaps an existing slab']
      });
    }

    const user = toAuditUser(auditUser);
    const sortOrder = existingSlabs.length;

    await prisma.hrmPayeSlab.create({
      data: {
        hrmVariableId: parent.id,
        fromSalary: parsed.data.fromSalary,
        toSalary,
        taxRate: parsed.data.taxRate,
        sortOrder,
        createdBy: user?.id,
        updatedBy: user?.id
      }
    });

    await prisma.hrmVariable.update({
      where: { id: parent.id },
      data: { updatedBy: user?.id }
    });

    const refreshed = await findSingleton();
    if (!refreshed) {
      return { success: false, error: { message: 'HRM variable not found' } };
    }
    return { success: true, data: await attachAuditUsers(refreshed) };
  } catch (error: any) {
    console.error('createPayeSlab error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create PAYE slab' }
    };
  }
}

export async function deletePayeSlab(
  id: string,
  auditUser?: AuditUser
): Promise<{
  success: boolean;
  data?: HrmVariableServiceRecord;
  error?: { message: string };
}> {
  try {
    if (!id?.trim()) {
      return { success: false, error: { message: 'Invalid slab ID' } };
    }

    const slab = await prisma.hrmPayeSlab.findUnique({ where: { id } });
    if (!slab) {
      return { success: false, error: { message: 'PAYE slab not found' } };
    }

    const user = toAuditUser(auditUser);
    await prisma.hrmPayeSlab.delete({ where: { id } });
    await prisma.hrmVariable.update({
      where: { id: slab.hrmVariableId },
      data: { updatedBy: user?.id }
    });

    const refreshed = await findSingleton();
    if (!refreshed) {
      return { success: true, data: undefined };
    }
    return { success: true, data: await attachAuditUsers(refreshed) };
  } catch (error: any) {
    console.error('deletePayeSlab error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete PAYE slab' }
    };
  }
}
