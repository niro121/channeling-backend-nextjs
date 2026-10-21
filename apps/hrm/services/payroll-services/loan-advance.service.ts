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
import { getBankName } from '@/types/bank';
import { getInstitutionName } from '@/types/institution';
import {
  DEPARTMENT_OPTIONS,
  ROSTER_OPTIONS,
  STAFF_CATEGORY_OPTIONS,
  STAFF_DESIGNATION_OPTIONS,
  STAFF_GRADE_OPTIONS
} from '@/types/staff-employment-options';
import {
  LOAN_ADVANCE_CODE_PREFIX,
  type GetLoanAdvanceParams,
  type LoanAdvancePayload,
  type LoanAdvanceRecord,
  type LoanAdvanceStatus,
  type LoanAdvanceSummary
} from '@/types/payroll';

const payloadSchema = z.object({
  componentId: z.string().min(1, 'Loan component is required'),
  staffId: z.string().min(1, 'Employee is required'),
  loanNumber: z
    .string()
    .min(1, 'Loan number is required')
    .transform((v) => v.trim()),
  bankId: z.string().min(1, 'Bank is required'),
  branch: z
    .string()
    .min(1, 'Branch is required')
    .transform((v) => v.trim()),
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .transform((v) => v.trim()),
  startingBalance: z.coerce.number().finite().min(0),
  loanAmount: z.coerce.number().finite().min(0),
  monthlyInstallment: z.coerce.number().finite().min(0),
  fromDate: z.coerce.date({ message: 'From date is required' }),
  toDate: z.coerce.date({ message: 'To date is required' }),
  comments: z
    .string()
    .optional()
    .default('')
    .transform((v) => v.trim()),
  scheduleForPaid: z.boolean().optional().default(false),
  completed: z.boolean().optional().default(false),
  completionDate: z.coerce.date().nullable().optional()
});

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function labelFromOptions(
  options: readonly { id: string; name: string }[],
  id: string | null | undefined
): string {
  if (!id) return '';
  return options.find((item) => item.id === id)?.name ?? id;
}

function institutionLabel(id: string | null | undefined): string {
  if (!id) return '';
  const asNum = Number(id);
  if (!Number.isNaN(asNum) && String(asNum) === id) {
    return getInstitutionName(asNum);
  }
  return id;
}

function computeStatus(
  completed: boolean,
  fromDate: Date,
  today = startOfDay(new Date())
): LoanAdvanceStatus {
  if (completed) return 'completed';
  if (startOfDay(fromDate) <= today) return 'ongoing';
  return 'active';
}

const recordSelect = {
  id: true,
  code: true,
  componentId: true,
  staffId: true,
  loanNumber: true,
  bankId: true,
  bankName: true,
  branch: true,
  accountNumber: true,
  startingBalance: true,
  loanAmount: true,
  monthlyInstallment: true,
  outstanding: true,
  fromDate: true,
  toDate: true,
  comments: true,
  scheduleForPaid: true,
  completed: true,
  completionDate: true,
  componentName: true,
  staffCode: true,
  staffName: true,
  institution: true,
  department: true,
  roster: true,
  grade: true,
  staffCategory: true,
  designation: true,
  resignDate: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

function mapRecord(record: {
  id: string;
  code: string;
  componentId: string;
  staffId: string;
  loanNumber: string;
  bankId: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  startingBalance: number;
  loanAmount: number;
  monthlyInstallment: number;
  outstanding: number;
  fromDate: Date;
  toDate: Date;
  comments: string;
  scheduleForPaid: boolean;
  completed: boolean;
  completionDate: Date | null;
  componentName: string;
  staffCode: string;
  staffName: string;
  institution: string;
  department: string;
  roster: string;
  grade: string;
  staffCategory: string;
  designation: string;
  resignDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
}): LoanAdvanceRecord {
  return {
    id: record.id,
    code: record.code,
    componentId: record.componentId,
    componentName: record.componentName || '—',
    staffId: record.staffId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    institution: record.institution || '—',
    department: record.department || '—',
    roster: record.roster || '—',
    grade: record.grade || '—',
    staffCategory: record.staffCategory || '—',
    designation: record.designation || '—',
    resignDate: toIsoString(record.resignDate),
    bankId: record.bankId,
    bankName: record.bankName || getBankName(record.bankId),
    branch: record.branch,
    accountNumber: record.accountNumber,
    loanNumber: record.loanNumber,
    startingBalance: record.startingBalance,
    loanAmount: record.loanAmount,
    monthlyInstallment: record.monthlyInstallment,
    outstanding: record.outstanding,
    fromDate: toIsoString(record.fromDate),
    toDate: toIsoString(record.toDate),
    comments: record.comments,
    scheduleForPaid: record.scheduleForPaid,
    completed: record.completed,
    completionDate: toIsoString(record.completionDate),
    status: computeStatus(record.completed, record.fromDate),
    createdBy: record.createdUser?.name ?? null,
    createdAt: toIsoString(record.createdAt),
    updatedBy: record.updatedUser?.name ?? null,
    updatedAt: toIsoString(record.updatedAt)
  };
}

function buildWhere(
  params: GetLoanAdvanceParams
): Prisma.LoanAdvanceWhereInput {
  const and: Prisma.LoanAdvanceWhereInput[] = [];

  if (params.componentId) and.push({ componentId: params.componentId });
  if (params.staffId) and.push({ staffId: params.staffId });
  if (params.departmentId) and.push({ departmentId: params.departmentId });
  if (params.institution && params.institution !== '__all__') {
    and.push({ institutionId: params.institution });
  }
  if (params.staffCategory) {
    and.push({ staffCategoryId: params.staffCategory });
  }
  if (params.designationId) {
    and.push({ designationId: params.designationId });
  }
  if (params.rosterId) {
    and.push({ rosterId: params.rosterId.trim().toUpperCase() });
  }
  if (params.fromDate) {
    const from = new Date(params.fromDate);
    and.push({
      OR: [{ toDate: { gte: from } }, { fromDate: { gte: from } }]
    });
  }

  return and.length ? { AND: and } : {};
}

function fieldError(
  field: string,
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

function pagination(params: GetLoanAdvanceParams) {
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
      Number(params.limit) || Number.parseInt(defaultPerPage, 10) || 10
    )
  );
  return { pageNumber, pageSize, skip: (pageNumber - 1) * pageSize };
}

async function resolveStaffSnapshot(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      code: true,
      name: true,
      hrDetails: true,
      employmentDetails: true
    }
  });
  if (!staff) return null;

  const employment = staff.employmentDetails?.employment;
  const institutionId = employment?.institution ?? '';
  const departmentId = employment?.department ?? '';
  const staffCategoryId = employment?.staffCategory ?? '';
  const designationId = employment?.staffDesignation ?? '';
  const gradeId = employment?.staffGrade ?? '';
  const rosterKey = employment?.roster ?? '';

  const [departmentRow, designationRow, rosterRow] = await Promise.all([
    departmentId
      ? prisma.department.findUnique({
          where: { id: departmentId },
          select: { name: true }
        })
      : Promise.resolve(null),
    designationId
      ? prisma.designation.findUnique({
          where: { id: designationId },
          select: { name: true }
        })
      : Promise.resolve(null),
    rosterKey
      ? prisma.manageRoster.findFirst({
          where: {
            OR: [{ code: rosterKey }, { id: rosterKey }]
          },
          select: { name: true, code: true }
        })
      : Promise.resolve(null)
  ]);

  const rosterCode = rosterRow?.code?.trim() || rosterKey;

  return {
    staffCode: staff.code,
    staffName: staff.name,
    institutionId,
    institution: institutionLabel(institutionId),
    departmentId,
    department:
      departmentRow?.name ||
      labelFromOptions(DEPARTMENT_OPTIONS, departmentId),
    staffCategoryId,
    staffCategory: labelFromOptions(STAFF_CATEGORY_OPTIONS, staffCategoryId),
    designationId,
    designation:
      designationRow?.name ||
      labelFromOptions(STAFF_DESIGNATION_OPTIONS, designationId),
    grade: labelFromOptions(STAFF_GRADE_OPTIONS, gradeId),
    rosterId: rosterCode,
    roster:
      rosterRow?.name || labelFromOptions(ROSTER_OPTIONS, rosterKey),
    resignDate:
      staff.hrDetails?.dateResigned ??
      staff.hrDetails?.resignedWithNoticeDate ??
      null
  };
}

async function resolveComponentSnapshot(componentId: string) {
  const component = await prisma.paysheetComponent.findUnique({
    where: { id: componentId },
    select: { id: true, name: true, typeId: true }
  });
  if (!component) return null;
  if (component.typeId !== 'loan' && component.typeId !== 'advance') {
    return null;
  }
  return { componentName: component.name };
}

function resolveOutstanding(input: {
  completed: boolean;
  startingBalance: number;
  loanAmount: number;
  previousOutstanding?: number;
}): number {
  if (input.completed) return 0;
  if (input.previousOutstanding != null) {
    return Math.max(0, input.previousOutstanding);
  }
  if (input.startingBalance > 0) return input.startingBalance;
  return Math.max(0, input.loanAmount);
}

export async function getLoanAdvanceList(
  params: GetLoanAdvanceParams = {}
): Promise<{
  success: boolean;
  data?: LoanAdvanceRecord[];
  total?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const { pageSize, skip } = pagination(params);

    const [total, rows] = await Promise.all([
      prisma.loanAdvance.count({ where }),
      prisma.loanAdvance.findMany({
        where,
        select: recordSelect,
        orderBy: [{ updatedAt: 'desc' }, { staffName: 'asc' }],
        skip,
        take: pageSize
      })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: withUsers.map(mapRecord),
      total
    };
  } catch (error: any) {
    console.error('getLoanAdvanceList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch loans & advances' }
    };
  }
}

export async function getLoanAdvanceById(id: string): Promise<{
  success: boolean;
  data?: LoanAdvanceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid loan ID' } };
    }
    const record = await prisma.loanAdvance.findUnique({
      where: { id },
      select: recordSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Loan / advance not found' } };
    }
    const [withUsers] = await resolveAuthUsers([record]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('getLoanAdvanceById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get loan / advance' }
    };
  }
}

export async function getLoanAdvanceSummary(
  params: GetLoanAdvanceParams = {}
): Promise<{
  success: boolean;
  data?: LoanAdvanceSummary;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere({ ...params, page: undefined, limit: undefined });
    const rows = await prisma.loanAdvance.findMany({
      where,
      select: {
        completed: true,
        outstanding: true,
        monthlyInstallment: true,
        fromDate: true,
        completionDate: true
      }
    });

    const today = startOfDay(new Date());
    const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));

    let activeLoans = 0;
    let outstanding = 0;
    let thisMonthDeducted = 0;
    let completedYtd = 0;

    for (const row of rows) {
      const status = computeStatus(row.completed, row.fromDate, today);
      if (status === 'active' || status === 'ongoing') {
        activeLoans += 1;
        outstanding += row.outstanding;
      }
      if (status === 'ongoing') {
        // Until Salary Generation posts real deductions, estimate scheduled month amount.
        thisMonthDeducted += row.monthlyInstallment;
      }
      if (
        row.completed &&
        row.completionDate &&
        startOfDay(row.completionDate) >= yearStart
      ) {
        completedYtd += 1;
      }
    }

    return {
      success: true,
      data: {
        activeLoans,
        outstanding,
        thisMonthDeducted,
        completedYtd
      }
    };
  } catch (error: any) {
    console.error('getLoanAdvanceSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load summary' }
    };
  }
}

export async function getLoanAdvanceExportRows(
  params: GetLoanAdvanceParams = {}
): Promise<{
  success: boolean;
  data?: LoanAdvanceRecord[];
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const rows = await prisma.loanAdvance.findMany({
      where,
      select: recordSelect,
      orderBy: [{ staffName: 'asc' }, { fromDate: 'desc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    return { success: true, data: withUsers.map(mapRecord) };
  } catch (error: any) {
    console.error('getLoanAdvanceExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export loans & advances' }
    };
  }
}

export async function createLoanAdvance(
  payload: LoanAdvancePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: LoanAdvanceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    if (parsed.data.toDate < parsed.data.fromDate) {
      return fieldError('toDate', 'To date must be on or after from date');
    }
    if (parsed.data.completed && !parsed.data.completionDate) {
      return fieldError('completionDate', 'Completion date is required');
    }

    const staffSnap = await resolveStaffSnapshot(parsed.data.staffId);
    if (!staffSnap) {
      return fieldError('staffId', 'Staff member not found');
    }

    const componentSnap = await resolveComponentSnapshot(
      parsed.data.componentId
    );
    if (!componentSnap) {
      return fieldError(
        'componentId',
        'Select a loan or advance paysheet component'
      );
    }

    const duplicate = await prisma.loanAdvance.findFirst({
      where: {
        staffId: parsed.data.staffId,
        loanNumber: parsed.data.loanNumber
      },
      select: { id: true }
    });
    if (duplicate) {
      return fieldError(
        'loanNumber',
        'This loan number already exists for the selected employee'
      );
    }

    const generated = await generateRecordCode(LOAN_ADVANCE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate loan / advance code' }
      };
    }

    const completed = parsed.data.completed ?? false;
    const outstanding = resolveOutstanding({
      completed,
      startingBalance: parsed.data.startingBalance,
      loanAmount: parsed.data.loanAmount
    });

    const auditUser = toAuditUser(user);
    const created = await prisma.loanAdvance.create({
      data: {
        code: generated.code,
        componentId: parsed.data.componentId,
        staffId: parsed.data.staffId,
        loanNumber: parsed.data.loanNumber,
        bankId: parsed.data.bankId,
        bankName: getBankName(parsed.data.bankId),
        branch: parsed.data.branch,
        accountNumber: parsed.data.accountNumber,
        startingBalance: parsed.data.startingBalance,
        loanAmount: parsed.data.loanAmount,
        monthlyInstallment: parsed.data.monthlyInstallment,
        outstanding,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        comments: parsed.data.comments ?? '',
        scheduleForPaid: parsed.data.scheduleForPaid ?? false,
        completed,
        completionDate: completed
          ? (parsed.data.completionDate ?? null)
          : null,
        componentName: componentSnap.componentName,
        ...staffSnap,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: recordSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('createLoanAdvance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create loan / advance' }
    };
  }
}

export async function updateLoanAdvance(
  id: string,
  payload: LoanAdvancePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: LoanAdvanceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid loan ID' } };
    }

    const existing = await prisma.loanAdvance.findUnique({
      where: { id },
      select: { id: true, outstanding: true }
    });
    if (!existing) {
      return {
        success: false,
        error: { message: 'Loan / advance not found' }
      };
    }

    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    if (parsed.data.toDate < parsed.data.fromDate) {
      return fieldError('toDate', 'To date must be on or after from date');
    }
    if (parsed.data.completed && !parsed.data.completionDate) {
      return fieldError('completionDate', 'Completion date is required');
    }

    const staffSnap = await resolveStaffSnapshot(parsed.data.staffId);
    if (!staffSnap) {
      return fieldError('staffId', 'Staff member not found');
    }

    const componentSnap = await resolveComponentSnapshot(
      parsed.data.componentId
    );
    if (!componentSnap) {
      return fieldError(
        'componentId',
        'Select a loan or advance paysheet component'
      );
    }

    const duplicate = await prisma.loanAdvance.findFirst({
      where: {
        staffId: parsed.data.staffId,
        loanNumber: parsed.data.loanNumber,
        id: { not: id }
      },
      select: { id: true }
    });
    if (duplicate) {
      return fieldError(
        'loanNumber',
        'This loan number already exists for the selected employee'
      );
    }

    const completed = parsed.data.completed ?? false;
    const outstanding = resolveOutstanding({
      completed,
      startingBalance: parsed.data.startingBalance,
      loanAmount: parsed.data.loanAmount,
      previousOutstanding: completed ? 0 : existing.outstanding
    });

    const auditUser = toAuditUser(user);
    const updated = await prisma.loanAdvance.update({
      where: { id },
      data: {
        componentId: parsed.data.componentId,
        staffId: parsed.data.staffId,
        loanNumber: parsed.data.loanNumber,
        bankId: parsed.data.bankId,
        bankName: getBankName(parsed.data.bankId),
        branch: parsed.data.branch,
        accountNumber: parsed.data.accountNumber,
        startingBalance: parsed.data.startingBalance,
        loanAmount: parsed.data.loanAmount,
        monthlyInstallment: parsed.data.monthlyInstallment,
        outstanding,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        comments: parsed.data.comments ?? '',
        scheduleForPaid: parsed.data.scheduleForPaid ?? false,
        completed,
        completionDate: completed
          ? (parsed.data.completionDate ?? null)
          : null,
        componentName: componentSnap.componentName,
        ...staffSnap,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: recordSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return { success: true, data: mapRecord(withUsers) };
  } catch (error: any) {
    console.error('updateLoanAdvance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update loan / advance' }
    };
  }
}

export async function deleteLoanAdvance(id: string): Promise<{
  success: boolean;
  data?: { deleted: boolean };
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid loan ID' } };
    }
    await prisma.loanAdvance.delete({ where: { id } });
    return { success: true, data: { deleted: true } };
  } catch (error: any) {
    console.error('deleteLoanAdvance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete loan / advance' }
    };
  }
}
