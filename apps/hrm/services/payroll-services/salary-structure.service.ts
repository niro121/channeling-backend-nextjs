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
import { getInstitutionName } from '@/types/institution';
import {
  DEPARTMENT_OPTIONS,
  STAFF_CATEGORY_OPTIONS,
  STAFF_DESIGNATION_OPTIONS
} from '@/types/staff-employment-options';
import {
  SALARY_STRUCTURE_CODE_PREFIX,
  type GetSalaryStructureParams,
  type SalaryStructureCalcMethod,
  type SalaryStructureLine,
  type SalaryStructurePayload,
  type SalaryStructureRecord,
  type SalaryStructureStatus,
  type SalaryStructureSummary
} from '@/types/payroll';

const CALC_METHODS = [
  'fixed',
  'percent_of_basic',
  'tax_table',
  'auto',
  'basic_div_200',
  'basic_div_30'
] as const;

const STATUSES = ['active', 'inactive', 'draft'] as const;

const SECTIONS = [
  'earnings',
  'deductions',
  'employerContributions',
  'otherComponents'
] as const;

const lineSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().nullable().optional(),
  name: z.string().trim().min(1, 'Component name is required'),
  calcMethod: z.enum(CALC_METHODS),
  value: z.string().default('')
});

const payloadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Structure name is required')
      .max(150, 'Must be less than 150 characters'),
    institutionId: z.string().optional().default(''),
    departmentId: z.string().optional().default('__all__'),
    staffCategoryId: z.string().min(1, 'Staff category is required'),
    designationId: z.string().min(1, 'Designation is required'),
    basicSalary: z.coerce.number().min(0, 'Basic salary must be 0 or more'),
    effectiveFrom: z.union([z.string(), z.date()]),
    effectiveTo: z.union([z.string(), z.date(), z.null()]).optional(),
    status: z.enum(STATUSES),
    earnings: z.array(lineSchema).default([]),
    deductions: z.array(lineSchema).default([]),
    employerContributions: z.array(lineSchema).default([]),
    otherComponents: z.array(lineSchema).default([])
  })
  .superRefine((data, ctx) => {
    const from = toDate(data.effectiveFrom);
    if (!from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effectiveFrom'],
        message: 'Effective from date is required'
      });
      return;
    }
    const to = data.effectiveTo != null ? toDate(data.effectiveTo) : null;
    if (data.effectiveTo != null && data.effectiveTo !== '' && !to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effectiveTo'],
        message: 'Enter a valid date'
      });
    }
    if (from && to && to.getTime() < from.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effectiveTo'],
        message: 'Must be on or after Effective from'
      });
    }
  });

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
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

function validationError(issues: Record<string, string[]>) {
  return {
    success: false as const,
    error: { message: 'Validation failed', issues }
  };
}

function optionName(
  options: readonly { id: string; name: string }[],
  id: string | null | undefined
): string {
  if (!id || id === '__all__') return id === '__all__' ? 'All' : '—';
  return options.find((item) => item.id === id)?.name ?? id;
}

function institutionLabel(id: string | null | undefined): string {
  if (!id?.trim()) return '—';
  const n = Number(id);
  if (Number.isFinite(n)) return getInstitutionName(n);
  return id;
}

function parseMoney(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function sumFixedLines(lines: SalaryStructureLine[]): number {
  return lines.reduce((total, line) => {
    if (line.calcMethod !== 'fixed') return total;
    return total + parseMoney(line.value);
  }, 0);
}

function computeTotals(
  basicSalary: number,
  earnings: SalaryStructureLine[],
  deductions: SalaryStructureLine[]
) {
  const allowancesTotal = sumFixedLines(earnings);
  const deductionsTotal = sumFixedLines(deductions);
  const gross = basicSalary + allowancesTotal;
  return { allowancesTotal, deductionsTotal, gross };
}

function flattenLines(payload: {
  earnings: SalaryStructureLine[];
  deductions: SalaryStructureLine[];
  employerContributions: SalaryStructureLine[];
  otherComponents: SalaryStructureLine[];
}) {
  return [
    ...payload.earnings.map((line) => ({
      ...line,
      componentId: line.componentId ?? null,
      section: 'earnings' as const
    })),
    ...payload.deductions.map((line) => ({
      ...line,
      componentId: line.componentId ?? null,
      section: 'deductions' as const
    })),
    ...payload.employerContributions.map((line) => ({
      ...line,
      componentId: line.componentId ?? null,
      section: 'employerContributions' as const
    })),
    ...payload.otherComponents.map((line) => ({
      ...line,
      componentId: line.componentId ?? null,
      section: 'otherComponents' as const
    }))
  ];
}

function splitLines(
  lines: Array<{
    id: string;
    componentId?: string | null;
    name: string;
    calcMethod: string;
    value: string;
    section: string;
  }>
): Pick<
  SalaryStructureRecord,
  'earnings' | 'deductions' | 'employerContributions' | 'otherComponents'
> {
  const empty = {
    earnings: [] as SalaryStructureLine[],
    deductions: [] as SalaryStructureLine[],
    employerContributions: [] as SalaryStructureLine[],
    otherComponents: [] as SalaryStructureLine[]
  };

  for (const line of lines) {
    const mapped: SalaryStructureLine = {
      id: line.id,
      componentId: line.componentId ?? null,
      name: line.name,
      calcMethod: line.calcMethod as SalaryStructureCalcMethod,
      value: line.value ?? ''
    };
    if ((SECTIONS as readonly string[]).includes(line.section)) {
      empty[line.section as (typeof SECTIONS)[number]].push(mapped);
    }
  }
  return empty;
}

const structureSelect = {
  id: true,
  code: true,
  name: true,
  institutionId: true,
  departmentId: true,
  staffCategoryId: true,
  designationId: true,
  basicSalary: true,
  allowancesTotal: true,
  deductionsTotal: true,
  gross: true,
  staffCovered: true,
  effectiveFrom: true,
  effectiveTo: true,
  status: true,
  lines: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} satisfies Prisma.SalaryStructureSelect;

function mapRecord(
  record: Prisma.SalaryStructureGetPayload<{ select: typeof structureSelect }>,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): SalaryStructureRecord {
  const sections = splitLines(record.lines ?? []);
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    institutionId: record.institutionId || undefined,
    institution: institutionLabel(record.institutionId),
    departmentId: record.departmentId || undefined,
    department: optionName(DEPARTMENT_OPTIONS, record.departmentId),
    staffCategoryId: record.staffCategoryId || undefined,
    staffCategory: optionName(STAFF_CATEGORY_OPTIONS, record.staffCategoryId),
    designationId: record.designationId || undefined,
    designation: optionName(STAFF_DESIGNATION_OPTIONS, record.designationId),
    basicSalary: record.basicSalary,
    allowancesTotal: record.allowancesTotal,
    deductionsTotal: record.deductionsTotal,
    gross: record.gross,
    staffCovered: record.staffCovered,
    effectiveFrom: toIsoString(record.effectiveFrom),
    effectiveTo: toIsoString(record.effectiveTo),
    status: record.status as SalaryStructureStatus,
    ...sections,
    createdBy: users?.createdUser?.name ?? null,
    createdAt: toIsoString(record.createdAt),
    updatedBy: users?.updatedUser?.name ?? null,
    updatedAt: toIsoString(record.updatedAt)
  };
}

async function attachAuditNames(
  records: Prisma.SalaryStructureGetPayload<{
    select: typeof structureSelect;
  }>[]
): Promise<SalaryStructureRecord[]> {
  const withUsers = await resolveAuthUsers(records);
  return withUsers.map((record) =>
    mapRecord(record, {
      createdUser: record.createdUser,
      updatedUser: record.updatedUser
    })
  );
}

function buildWhere(
  params: GetSalaryStructureParams
): Prisma.SalaryStructureWhereInput {
  const and: Prisma.SalaryStructureWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (params.institution && params.institution !== '__all__') {
    and.push({ institutionId: params.institution });
  }
  if (params.departmentId && params.departmentId !== '__all__') {
    and.push({ departmentId: params.departmentId });
  }
  if (params.staffCategory && params.staffCategory !== '__all__') {
    and.push({ staffCategoryId: params.staffCategory });
  }
  if (params.designationId && params.designationId !== '__all__') {
    and.push({ designationId: params.designationId });
  }
  if (params.structureId) {
    and.push({ id: params.structureId });
  }
  if (params.status && params.status !== '__all__') {
    and.push({ status: params.status });
  }
  if (params.effectiveDate) {
    const day = toDate(params.effectiveDate);
    if (day) {
      and.push({ effectiveFrom: { lte: day } });
      and.push({
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }]
      });
    }
  }

  return and.length ? { AND: and } : {};
}

export async function getSalaryStructureList(
  params: GetSalaryStructureParams = {}
): Promise<{
  success: boolean;
  data?: SalaryStructureRecord[];
  total?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const pageNumber = Math.max(
      1,
      Number(params.page) ||
        Number.parseInt(process.env.DEFAULT_PAGE ?? '0', 10) ||
        1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number(params.limit) ||
          Number.parseInt(defaultPerPage, 10) ||
          10
      )
    );
    const skip = (pageNumber - 1) * pageSize;

    const [total, rows] = await Promise.all([
      prisma.salaryStructure.count({ where }),
      prisma.salaryStructure.findMany({
        where,
        select: structureSelect,
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        skip,
        take: pageSize
      })
    ]);

    return {
      success: true,
      data: await attachAuditNames(rows),
      total
    };
  } catch (error: any) {
    console.error('getSalaryStructureList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch salary structures' }
    };
  }
}

export async function getSalaryStructureSummary(
  params: GetSalaryStructureParams = {}
): Promise<{
  success: boolean;
  data?: SalaryStructureSummary;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const [totalStructures, active, draft, covered] = await Promise.all([
      prisma.salaryStructure.count({ where }),
      prisma.salaryStructure.count({
        where: { AND: [where, { status: 'active' }] }
      }),
      prisma.salaryStructure.count({
        where: { AND: [where, { status: 'draft' }] }
      }),
      prisma.salaryStructure.aggregate({
        where,
        _sum: { staffCovered: true }
      })
    ]);

    return {
      success: true,
      data: {
        totalStructures,
        active,
        draft,
        staffCovered: covered._sum.staffCovered ?? 0
      }
    };
  } catch (error: any) {
    console.error('getSalaryStructureSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch summary' }
    };
  }
}

export async function getSalaryStructureOptions(): Promise<{
  success: boolean;
  data?: { id: string; name: string }[];
  error?: { message?: string };
}> {
  try {
    const rows = await prisma.salaryStructure.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' }
    });
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: `${row.code} — ${row.name}`
      }))
    };
  } catch (error: any) {
    console.error('getSalaryStructureOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch options' }
    };
  }
}

export async function getSalaryStructureById(id: string): Promise<{
  success: boolean;
  data?: SalaryStructureRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid structure ID' } };
    }
    const record = await prisma.salaryStructure.findUnique({
      where: { id },
      select: structureSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Salary structure not found' } };
    }
    const [mapped] = await attachAuditNames([record]);
    return { success: true, data: mapped };
  } catch (error: any) {
    console.error('getSalaryStructureById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch salary structure' }
    };
  }
}

export async function createSalaryStructure(
  data: SalaryStructurePayload,
  auditUser?: AuditUser | null
): Promise<{
  success: boolean;
  data?: SalaryStructureRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = payloadSchema.safeParse(data);
    if (!parsed.success) {
      return validationError(zodIssues(parsed.error));
    }

    const values = parsed.data;
    const effectiveFrom = toDate(values.effectiveFrom)!;
    const effectiveTo =
      values.effectiveTo != null && values.effectiveTo !== ''
        ? toDate(values.effectiveTo)
        : null;

    const totals = computeTotals(
      values.basicSalary,
      values.earnings,
      values.deductions
    );

    const generated = await generateRecordCode(SALARY_STRUCTURE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate structure code' }
      };
    }

    const audit = toAuditUser(auditUser);
    const created = await prisma.salaryStructure.create({
      data: {
        code: generated.code,
        name: values.name,
        institutionId: values.institutionId ?? '',
        departmentId: values.departmentId || '__all__',
        staffCategoryId: values.staffCategoryId,
        designationId: values.designationId,
        basicSalary: values.basicSalary,
        allowancesTotal: totals.allowancesTotal,
        deductionsTotal: totals.deductionsTotal,
        gross: totals.gross,
        staffCovered: 0,
        effectiveFrom,
        effectiveTo,
        status: values.status,
        lines: flattenLines(values),
        createdBy: audit?.id ?? null,
        updatedBy: audit?.id ?? null
      },
      select: structureSelect
    });

    const [mapped] = await attachAuditNames([created]);
    return { success: true, data: mapped };
  } catch (error: any) {
    console.error('createSalaryStructure error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create salary structure' }
    };
  }
}

export async function updateSalaryStructure(
  id: string,
  data: SalaryStructurePayload,
  auditUser?: AuditUser | null
): Promise<{
  success: boolean;
  data?: SalaryStructureRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid structure ID' } };
    }

    const existing = await prisma.salaryStructure.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Salary structure not found' } };
    }

    const parsed = payloadSchema.safeParse(data);
    if (!parsed.success) {
      return validationError(zodIssues(parsed.error));
    }

    const values = parsed.data;
    const effectiveFrom = toDate(values.effectiveFrom)!;
    const effectiveTo =
      values.effectiveTo != null && values.effectiveTo !== ''
        ? toDate(values.effectiveTo)
        : null;
    const totals = computeTotals(
      values.basicSalary,
      values.earnings,
      values.deductions
    );
    const audit = toAuditUser(auditUser);

    const updated = await prisma.salaryStructure.update({
      where: { id },
      data: {
        name: values.name,
        institutionId: values.institutionId ?? '',
        departmentId: values.departmentId || '__all__',
        staffCategoryId: values.staffCategoryId,
        designationId: values.designationId,
        basicSalary: values.basicSalary,
        allowancesTotal: totals.allowancesTotal,
        deductionsTotal: totals.deductionsTotal,
        gross: totals.gross,
        effectiveFrom,
        effectiveTo,
        status: values.status,
        lines: flattenLines(values),
        updatedBy: audit?.id ?? null
      },
      select: structureSelect
    });

    const [mapped] = await attachAuditNames([updated]);
    return { success: true, data: mapped };
  } catch (error: any) {
    console.error('updateSalaryStructure error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update salary structure' }
    };
  }
}

export async function setSalaryStructureStatus(
  id: string,
  status: SalaryStructureStatus,
  auditUser?: AuditUser | null
): Promise<{
  success: boolean;
  data?: SalaryStructureRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid structure ID' } };
    }
    if (!(STATUSES as readonly string[]).includes(status)) {
      return { success: false, error: { message: 'Invalid status' } };
    }
    const audit = toAuditUser(auditUser);
    const updated = await prisma.salaryStructure.update({
      where: { id },
      data: { status, updatedBy: audit?.id ?? null },
      select: structureSelect
    });
    const [mapped] = await attachAuditNames([updated]);
    return { success: true, data: mapped };
  } catch (error: any) {
    console.error('setSalaryStructureStatus error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update status' }
    };
  }
}

export async function duplicateSalaryStructure(
  id: string,
  auditUser?: AuditUser | null
): Promise<{
  success: boolean;
  data?: SalaryStructureRecord;
  error?: { message?: string };
}> {
  try {
    const source = await getSalaryStructureById(id);
    if (!source.success || !source.data) {
      return {
        success: false,
        error: { message: source.error?.message ?? 'Salary structure not found' }
      };
    }
    const src = source.data;
    return createSalaryStructure(
      {
        name: `${src.name} (Copy)`,
        institutionId: src.institutionId ?? '',
        departmentId: src.departmentId ?? '__all__',
        staffCategoryId: src.staffCategoryId ?? '',
        designationId: src.designationId ?? '',
        basicSalary: src.basicSalary,
        effectiveFrom: src.effectiveFrom ?? new Date().toISOString(),
        effectiveTo: src.effectiveTo,
        status: 'draft',
        earnings: src.earnings.map((line) => ({
          ...line,
          id: crypto.randomUUID()
        })),
        deductions: src.deductions.map((line) => ({
          ...line,
          id: crypto.randomUUID()
        })),
        employerContributions: src.employerContributions.map((line) => ({
          ...line,
          id: crypto.randomUUID()
        })),
        otherComponents: src.otherComponents.map((line) => ({
          ...line,
          id: crypto.randomUUID()
        }))
      },
      auditUser
    );
  } catch (error: any) {
    console.error('duplicateSalaryStructure error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to duplicate salary structure' }
    };
  }
}

export async function deleteSalaryStructure(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid structure ID' } };
    }
    await prisma.salaryStructure.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteSalaryStructure error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete salary structure' }
    };
  }
}
