'use server';

import { endOfDay, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import {
  formatInstitutionCycleTitle,
  type GetSalaryCycleParams,
  type SalaryCycleOption,
  type SalaryCyclePayload,
  type SalaryCycleServiceRecord
} from '@/types/salary-cycle';

const INSTITUTION_IDS = [0, 1, 2, 3] as const;

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((v) => toDate(v as string | Date | null | undefined));

const requiredDate = z
  .union([z.string(), z.date()])
  .transform((v, ctx) => {
    const d = toDate(v);
    if (!d) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid date'
      });
      return z.NEVER;
    }
    return d;
  });

const salaryCyclePayloadSchema = z
  .object({
    institutionId: z.coerce
      .number()
      .int()
      .refine((id) => (INSTITUTION_IDS as readonly number[]).includes(id), {
        message: 'Invalid institution'
      }),
    salaryFromDate: requiredDate,
    salaryToDate: requiredDate,
    advanceFromDate: optionalDate,
    advanceToDate: optionalDate,
    otFromDate: optionalDate,
    otToDate: optionalDate,
    dayOffFromDate: optionalDate,
    dayOffToDate: optionalDate
  })
  .superRefine((data, ctx) => {
    if (data.salaryToDate.getTime() < data.salaryFromDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salaryToDate'],
        message: 'Must be on or after From date'
      });
    }
    const pairs: Array<[keyof typeof data, keyof typeof data]> = [
      ['advanceFromDate', 'advanceToDate'],
      ['otFromDate', 'otToDate'],
      ['dayOffFromDate', 'dayOffToDate']
    ];
    for (const [fromKey, toKey] of pairs) {
      const from = data[fromKey] as Date | null;
      const to = data[toKey] as Date | null;
      if (from && to && to.getTime() < from.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [toKey],
          message: 'Must be on or after From date'
        });
      }
    }
  });

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function validationError(issues: Record<string, string[]>) {
  return {
    success: false as const,
    error: { message: 'Validation failed', issues }
  };
}

function zodIssues(error: z.ZodError): Record<string, string[]> {
  const issues: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!issues[key]) issues[key] = [];
    issues[key].push(issue.message);
  }
  return issues;
}

function salaryWindowsOverlap(
  aFrom: Date,
  aTo: Date,
  bFrom: Date,
  bTo: Date
): boolean {
  return aFrom.getTime() <= bTo.getTime() && bFrom.getTime() <= aTo.getTime();
}

function mapServiceRecord(
  record: {
    id: string;
    institutionId: number;
    salaryFromDate: Date;
    salaryToDate: Date;
    advanceFromDate: Date | null;
    advanceToDate: Date | null;
    otFromDate: Date | null;
    otToDate: Date | null;
    dayOffFromDate: Date | null;
    dayOffToDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): SalaryCycleServiceRecord {
  return {
    id: record.id,
    institutionId: record.institutionId,
    salaryFromDate: record.salaryFromDate.toISOString(),
    salaryToDate: record.salaryToDate.toISOString(),
    advanceFromDate: toIsoString(record.advanceFromDate),
    advanceToDate: toIsoString(record.advanceToDate),
    otFromDate: toIsoString(record.otFromDate),
    otToDate: toIsoString(record.otToDate),
    dayOffFromDate: toIsoString(record.dayOffFromDate),
    dayOffToDate: toIsoString(record.dayOffToDate),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

async function attachAuditUsers(
  record: Parameters<typeof mapServiceRecord>[0]
): Promise<SalaryCycleServiceRecord> {
  const [withUsers] = await resolveAuthUsers([record]);
  return mapServiceRecord(withUsers, {
    createdUser: withUsers.createdUser,
    updatedUser: withUsers.updatedUser
  });
}

async function findOverlappingCycle(params: {
  institutionId: number;
  salaryFromDate: Date;
  salaryToDate: Date;
  excludeId?: string;
}) {
  const candidates = await prisma.salaryCycle.findMany({
    where: {
      institutionId: params.institutionId,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {})
    }
  });
  return candidates.find((c) =>
    salaryWindowsOverlap(
      params.salaryFromDate,
      params.salaryToDate,
      c.salaryFromDate,
      c.salaryToDate
    )
  );
}

function normalizePayloadDates(
  data: z.infer<typeof salaryCyclePayloadSchema>
) {
  return {
    institutionId: data.institutionId,
    salaryFromDate: startOfDay(data.salaryFromDate),
    salaryToDate: endOfDay(data.salaryToDate),
    advanceFromDate: data.advanceFromDate
      ? startOfDay(data.advanceFromDate)
      : null,
    advanceToDate: data.advanceToDate ? endOfDay(data.advanceToDate) : null,
    otFromDate: data.otFromDate,
    otToDate: data.otToDate,
    dayOffFromDate: data.dayOffFromDate,
    dayOffToDate: data.dayOffToDate
  };
}

export async function getSalaryCycleList(
  params: GetSalaryCycleParams = {}
): Promise<{
  success: boolean;
  data?: SalaryCycleServiceRecord[];
  error?: { message: string };
}> {
  try {
    const where =
      params.institutionId != null
        ? { institutionId: params.institutionId }
        : {};
    const records = await prisma.salaryCycle.findMany({
      where,
      orderBy: [{ salaryFromDate: 'desc' }]
    });

    let filtered = records;
    const query = params.search?.trim().toLowerCase();
    if (query) {
      filtered = records.filter((r) => {
        const label = `${r.salaryFromDate.toISOString()} ${r.salaryToDate.toISOString()}`.toLowerCase();
        return label.includes(query);
      });
    }

    const withUsers = await resolveAuthUsers(filtered);
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
    console.error('getSalaryCycleList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load salary cycles' }
    };
  }
}

function defaultWorkedDates(salaryFromDate: Date): {
  workedFromDate: string;
  workedToDate: string;
} {
  const monthStart = startOfMonth(salaryFromDate);
  const previousMonth = subMonths(monthStart, 1);
  return {
    workedFromDate: new Date(
      previousMonth.getFullYear(),
      previousMonth.getMonth(),
      15
    ).toISOString(),
    workedToDate: new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      14
    ).toISOString()
  };
}

export async function getSalaryCycleOptions(
  params: GetSalaryCycleParams = {}
): Promise<{
  success: boolean;
  data?: SalaryCycleOption[];
  error?: { message: string };
}> {
  try {
    const where =
      params.institutionId != null
        ? { institutionId: params.institutionId }
        : {};
    const records = await prisma.salaryCycle.findMany({
      where,
      select: {
        id: true,
        institutionId: true,
        salaryFromDate: true,
        salaryToDate: true,
        otFromDate: true,
        otToDate: true,
        dayOffFromDate: true,
        dayOffToDate: true
      },
      orderBy: [{ salaryFromDate: 'desc' }]
    });

    return {
      success: true,
      data: records.map((record) => {
        const defaults = defaultWorkedDates(record.salaryFromDate);
        const workedFrom =
          record.otFromDate ?? record.dayOffFromDate ?? null;
        const workedTo = record.otToDate ?? record.dayOffToDate ?? null;
        return {
          id: record.id,
          name: formatInstitutionCycleTitle(
            record.institutionId,
            record.salaryFromDate,
            record.salaryToDate
          ),
          institutionId: record.institutionId,
          salaryFromDate: record.salaryFromDate.toISOString(),
          salaryToDate: record.salaryToDate.toISOString(),
          workedFromDate: workedFrom
            ? workedFrom.toISOString()
            : defaults.workedFromDate,
          workedToDate: workedTo
            ? workedTo.toISOString()
            : defaults.workedToDate
        };
      })
    };
  } catch (error: any) {
    console.error('getSalaryCycleOptions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch salary cycle options'
      }
    };
  }
}

export async function getSalaryCycleById(id: string): Promise<{
  success: boolean;
  data?: SalaryCycleServiceRecord;
  error?: { message: string };
}> {
  try {
    if (!id?.trim()) {
      return { success: false, error: { message: 'Invalid cycle ID' } };
    }
    const record = await prisma.salaryCycle.findUnique({ where: { id } });
    if (!record) {
      return { success: false, error: { message: 'Salary cycle not found' } };
    }
    return { success: true, data: await attachAuditUsers(record) };
  } catch (error: any) {
    console.error('getSalaryCycleById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get salary cycle' }
    };
  }
}

export async function createSalaryCycle(
  data: SalaryCyclePayload,
  auditUser?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryCycleServiceRecord;
  error?: { message: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = salaryCyclePayloadSchema.safeParse(data);
    if (!parsed.success) {
      return validationError(zodIssues(parsed.error));
    }

    const normalized = normalizePayloadDates(parsed.data);
    const overlap = await findOverlappingCycle({
      institutionId: normalized.institutionId,
      salaryFromDate: normalized.salaryFromDate,
      salaryToDate: normalized.salaryToDate
    });
    if (overlap) {
      return validationError({
        salaryFromDate: [
          'Salary window overlaps another cycle for this institution'
        ]
      });
    }

    const user = toAuditUser(auditUser);
    const created = await prisma.salaryCycle.create({
      data: {
        ...normalized,
        createdBy: user?.id,
        updatedBy: user?.id
      }
    });
    return { success: true, data: await attachAuditUsers(created) };
  } catch (error: any) {
    console.error('createSalaryCycle error:', error);
    if (error.code === 'P2002') {
      return validationError({
        salaryFromDate: [
          'A cycle with this salary window already exists for this institution'
        ]
      });
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create salary cycle' }
    };
  }
}

export async function updateSalaryCycle(
  id: string,
  data: SalaryCyclePayload,
  auditUser?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryCycleServiceRecord;
  error?: { message: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id?.trim()) {
      return { success: false, error: { message: 'Invalid cycle ID' } };
    }

    const existing = await prisma.salaryCycle.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Salary cycle not found' } };
    }

    const parsed = salaryCyclePayloadSchema.safeParse(data);
    if (!parsed.success) {
      return validationError(zodIssues(parsed.error));
    }

    const normalized = normalizePayloadDates(parsed.data);
    const overlap = await findOverlappingCycle({
      institutionId: normalized.institutionId,
      salaryFromDate: normalized.salaryFromDate,
      salaryToDate: normalized.salaryToDate,
      excludeId: id
    });
    if (overlap) {
      return validationError({
        salaryFromDate: [
          'Salary window overlaps another cycle for this institution'
        ]
      });
    }

    const user = toAuditUser(auditUser);
    const updated = await prisma.salaryCycle.update({
      where: { id },
      data: {
        ...normalized,
        updatedBy: user?.id
      }
    });
    return { success: true, data: await attachAuditUsers(updated) };
  } catch (error: any) {
    console.error('updateSalaryCycle error:', error);
    if (error.code === 'P2002') {
      return validationError({
        salaryFromDate: [
          'A cycle with this salary window already exists for this institution'
        ]
      });
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update salary cycle' }
    };
  }
}

export async function deleteSalaryCycle(id: string): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    if (!id?.trim()) {
      return { success: false, error: { message: 'Invalid cycle ID' } };
    }
    const existing = await prisma.salaryCycle.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Salary cycle not found' } };
    }
    // Payroll in-use check deferred until SC5 consumers exist.
    await prisma.salaryCycle.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteSalaryCycle error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete salary cycle' }
    };
  }
}
