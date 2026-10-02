'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { getInstitutionName } from '@/types/institution';
import {
  DEPARTMENT_OPTIONS,
  ROSTER_OPTIONS,
  STAFF_CATEGORY_OPTIONS,
  STAFF_DESIGNATION_OPTIONS
} from '@/types/staff-employment-options';
import {
  formatInstitutionCycleTitle
} from '@/types/salary-cycle';
import {
  EMPTY_DEDUCTIONS_BREAKDOWN,
  EMPTY_EARNINGS_BREAKDOWN,
  PAYROLL_RUN_CODE_PREFIX,
  type GeneratePayrollRunPayload,
  type PayrollRunRecord,
  type PayrollRunStatus,
  type SalaryBreakdownChartPoint,
  type SalaryGenerationFillMode,
  type SalaryGenerationPreviewRow,
  type SalaryGenerationResult,
  type SalaryGenerationStaffFilters,
  type SalaryGenerationStaffRow,
  type SalaryGenerationSummary
} from '@/types/payroll';

const generateSchema = z.object({
  salaryCycleId: z.string().min(1, 'Salary cycle is required'),
  salaryFromDate: z.coerce.date({ message: 'Salary from date is required' }),
  salaryToDate: z.coerce.date({ message: 'Salary to date is required' }),
  workedFromDate: z.coerce.date({ message: 'Worked from date is required' }),
  workedToDate: z.coerce.date({ message: 'Worked to date is required' }),
  fillMode: z
    .enum(['all', 'not-generated', 'generated', 'resigned'])
    .optional()
    .default('all'),
  filters: z
    .object({
      staffId: z.string().optional(),
      institution: z.string().optional(),
      departmentId: z.string().optional(),
      staffCategory: z.string().optional(),
      designationId: z.string().optional(),
      rosterId: z.string().optional()
    })
    .optional()
});

type LineComponent = {
  source: string;
  componentId: string | null;
  name: string;
  typeId: string;
  section: string;
  amount: number;
};

type BuiltLine = {
  staffId: string;
  staffCode: string;
  staffName: string;
  roster: string;
  rosterId: string;
  designation: string;
  designationId: string;
  department: string;
  departmentId: string;
  institution: string;
  institutionId: string;
  staffCategory: string;
  staffCategoryId: string;
  resignDate: Date | null;
  workingDaysPh: number;
  workingDaysWork: number;
  basic: number;
  allowances: number;
  ot: number;
  otherEarnings: number;
  gross: number;
  epf8: number;
  epf12: number;
  etf3: number;
  paye: number;
  loans: number;
  otherDeductions: number;
  net: number;
  structureId: string | null;
  structureCode: string;
  structureName: string;
  components: LineComponent[];
};

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

function inclusiveDayCount(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

function labelFromOptions(
  options: readonly { id: string; name: string }[],
  id: string | null | undefined
): string {
  if (!id) return '';
  return options.find((item) => item.id === id)?.name ?? id;
}

function asRateFraction(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1 ? value / 100 : value;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function overlaps(
  fromA: Date,
  toA: Date | null | undefined,
  fromB: Date,
  toB: Date
): boolean {
  const endA = toA ?? new Date('9999-12-31T00:00:00.000Z');
  return fromA <= toB && endA >= fromB;
}

function computePaye(taxable: number, slabs: Array<{ fromSalary: number; toSalary: number | null; taxRate: number; sortOrder: number }>): number {
  if (taxable <= 0 || slabs.length === 0) return 0;
  const ordered = [...slabs].sort((a, b) => a.sortOrder - b.sortOrder || a.fromSalary - b.fromSalary);
  let tax = 0;
  for (const slab of ordered) {
    const from = slab.fromSalary;
    const to = slab.toSalary == null ? Number.POSITIVE_INFINITY : slab.toSalary;
    if (taxable <= from) continue;
    const taxableInSlab = Math.min(taxable, to) - from;
    if (taxableInSlab <= 0) continue;
    tax += taxableInSlab * asRateFraction(slab.taxRate);
  }
  return roundMoney(tax);
}

function buildBreakdowns(lines: BuiltLine[]): {
  earningsBreakdown: SalaryBreakdownChartPoint[];
  deductionsBreakdown: SalaryBreakdownChartPoint[];
  summary: SalaryGenerationSummary;
  totals: {
    totalBasic: number;
    totalAllowances: number;
    totalOt: number;
    totalOtherEarnings: number;
    totalEpf8: number;
    totalPaye: number;
    totalLoans: number;
    totalOtherDeductions: number;
    totalEarnings: number;
    totalDeductions: number;
    netPayable: number;
  };
} {
  const totals = {
    totalBasic: 0,
    totalAllowances: 0,
    totalOt: 0,
    totalOtherEarnings: 0,
    totalEpf8: 0,
    totalPaye: 0,
    totalLoans: 0,
    totalOtherDeductions: 0,
    totalEarnings: 0,
    totalDeductions: 0,
    netPayable: 0
  };

  for (const line of lines) {
    totals.totalBasic += line.basic;
    totals.totalAllowances += line.allowances;
    totals.totalOt += line.ot;
    totals.totalOtherEarnings += line.otherEarnings;
    totals.totalEpf8 += line.epf8;
    totals.totalPaye += line.paye;
    totals.totalLoans += line.loans;
    totals.totalOtherDeductions += line.otherDeductions;
    totals.totalEarnings += line.gross;
    totals.totalDeductions += line.epf8 + line.paye + line.loans + line.otherDeductions;
    totals.netPayable += line.net;
  }

  for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[key] = roundMoney(totals[key]);
  }

  return {
    totals,
    summary: {
      totalEarnings: totals.totalEarnings,
      totalDeductions: totals.totalDeductions,
      netPayable: totals.netPayable,
      employeeCount: lines.length
    },
    earningsBreakdown: [
      { category: 'Basic', amount: totals.totalBasic },
      { category: 'Allowances', amount: totals.totalAllowances },
      { category: 'OT', amount: totals.totalOt },
      { category: 'Other', amount: totals.totalOtherEarnings }
    ],
    deductionsBreakdown: [
      { category: 'EPF 8%', amount: totals.totalEpf8 },
      { category: 'PAYE', amount: totals.totalPaye },
      { category: 'Loans', amount: totals.totalLoans },
      { category: 'Other', amount: totals.totalOtherDeductions }
    ]
  };
}

function mapRunRecord(
  run: {
    id: string;
    code: string;
    salaryCycleId: string;
    cycleLabel: string;
    institutionId: number;
    institution: string;
    salaryFromDate: Date;
    salaryToDate: Date;
    workedFromDate: Date;
    workedToDate: Date;
    status: string;
    staffCount: number;
    totalEarnings: number;
    totalDeductions: number;
    netPayable: number;
    totalBasic: number;
    totalAllowances: number;
    totalOt: number;
    totalOtherEarnings: number;
    totalEpf8: number;
    totalPaye: number;
    totalLoans: number;
    totalOtherDeductions: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: Map<string, { name: string }>
): PayrollRunRecord {
  return {
    id: run.id,
    code: run.code,
    salaryCycleId: run.salaryCycleId,
    cycleLabel: run.cycleLabel,
    institutionId: run.institutionId,
    institution: run.institution,
    salaryFromDate: run.salaryFromDate.toISOString(),
    salaryToDate: run.salaryToDate.toISOString(),
    workedFromDate: run.workedFromDate.toISOString(),
    workedToDate: run.workedToDate.toISOString(),
    status: run.status as PayrollRunStatus,
    staffCount: run.staffCount,
    summary: {
      totalEarnings: run.totalEarnings,
      totalDeductions: run.totalDeductions,
      netPayable: run.netPayable,
      employeeCount: run.staffCount
    },
    earningsBreakdown: [
      { category: 'Basic', amount: run.totalBasic },
      { category: 'Allowances', amount: run.totalAllowances },
      { category: 'OT', amount: run.totalOt },
      { category: 'Other', amount: run.totalOtherEarnings }
    ],
    deductionsBreakdown: [
      { category: 'EPF 8%', amount: run.totalEpf8 },
      { category: 'PAYE', amount: run.totalPaye },
      { category: 'Loans', amount: run.totalLoans },
      { category: 'Other', amount: run.totalOtherDeductions }
    ],
    createdBy: run.createdBy
      ? users?.get(run.createdBy)?.name ?? run.createdBy
      : null,
    createdAt: toIsoString(run.createdAt),
    updatedBy: run.updatedBy
      ? users?.get(run.updatedBy)?.name ?? run.updatedBy
      : null,
    updatedAt: toIsoString(run.updatedAt)
  };
}

function mapStaffRow(line: {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  roster: string;
  designation: string;
  resignDate: Date | null;
  workingDaysPh: number;
  workingDaysWork: number;
}): SalaryGenerationStaffRow {
  return {
    id: line.id,
    staffId: line.staffId,
    roster: line.roster || '—',
    resignedDate: toIsoString(line.resignDate)?.slice(0, 10) ?? null,
    workingDaysPh: line.workingDaysPh,
    workingDaysWork: line.workingDaysWork,
    designation: line.designation || '—',
    code: line.staffCode,
    name: line.staffName
  };
}

function mapPreviewRow(line: {
  id: string;
  staffCode: string;
  staffName: string;
  basic: number;
  allowances: number;
  ot: number;
  gross: number;
  epf8: number;
  paye: number;
  loans: number;
  net: number;
}): SalaryGenerationPreviewRow {
  return {
    id: line.id,
    employee: `${line.staffName} (${line.staffCode})`,
    basic: line.basic,
    allowances: line.allowances,
    ot: line.ot,
    gross: line.gross,
    epf8: line.epf8,
    paye: line.paye,
    loans: line.loans,
    net: line.net
  };
}

async function resolveStaffMeta(staff: {
  id: string;
  code: string;
  name: string;
  hrDetails: { dateResigned?: Date | null; resignedWithNoticeDate?: Date | null } | null;
  employmentDetails: {
    employment?: {
      institution?: string | null;
      department?: string | null;
      staffCategory?: string | null;
      staffDesignation?: string | null;
      roster?: string | null;
    } | null;
  } | null;
}) {
  const employment = staff.employmentDetails?.employment;
  const institutionId = employment?.institution ?? '';
  const departmentId = employment?.department ?? '';
  const staffCategoryId = employment?.staffCategory ?? '';
  const designationId = employment?.staffDesignation ?? '';
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
  const resignDate =
    staff.hrDetails?.dateResigned ??
    staff.hrDetails?.resignedWithNoticeDate ??
    null;

  return {
    staffId: staff.id,
    staffCode: staff.code,
    staffName: staff.name,
    institutionId,
    institution:
      institutionId && !Number.isNaN(Number(institutionId))
        ? getInstitutionName(Number(institutionId))
        : institutionId,
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
    rosterId: rosterCode,
    roster: rosterRow?.name || labelFromOptions(ROSTER_OPTIONS, rosterKey),
    resignDate
  };
}

async function loadCandidateStaff(args: {
  institutionKey: string;
  salaryFrom: Date;
  salaryTo: Date;
  fillMode: SalaryGenerationFillMode;
  filters?: SalaryGenerationStaffFilters;
  existingStaffIds?: Set<string>;
}) {
  const and: Prisma.StaffWhereInput[] = [{ status: 1 }];
  const employmentEquals: Record<string, string> = {
    institution: args.institutionKey
  };

  const filters = args.filters ?? {};
  if (filters.institution && filters.institution !== '__all__') {
    employmentEquals.institution = filters.institution;
  }
  if (filters.departmentId) employmentEquals.department = filters.departmentId;
  if (filters.staffCategory) {
    employmentEquals.staffCategory = filters.staffCategory;
  }
  if (filters.designationId) {
    employmentEquals.staffDesignation = filters.designationId;
  }
  if (filters.rosterId) {
    employmentEquals.roster = filters.rosterId.trim().toUpperCase();
  }

  and.push({
    employmentDetails: {
      is: {
        employment: {
          is: employmentEquals
        }
      }
    }
  });

  if (filters.staffId) {
    and.push({ id: filters.staffId });
  }

  const rows = await prisma.staff.findMany({
    where: { AND: and },
    select: {
      id: true,
      code: true,
      name: true,
      hrDetails: true,
      employmentDetails: true
    },
    orderBy: [{ name: 'asc' }, { code: 'asc' }]
  });

  const existing = args.existingStaffIds ?? new Set<string>();

  return rows.filter((staff) => {
    const resign =
      staff.hrDetails?.dateResigned ??
      staff.hrDetails?.resignedWithNoticeDate ??
      null;

    if (args.fillMode === 'resigned') {
      return resign != null && resign <= args.salaryTo;
    }
    if (args.fillMode === 'generated') {
      return existing.has(staff.id);
    }
    if (args.fillMode === 'not-generated') {
      return !existing.has(staff.id);
    }
    // all — include active; still include resigned if resign after period start
    if (resign && resign < args.salaryFrom) return false;
    return true;
  });
}

async function buildLineForStaff(args: {
  staff: Awaited<ReturnType<typeof loadCandidateStaff>>[number];
  salaryFrom: Date;
  salaryTo: Date;
  workedFrom: Date;
  workedTo: Date;
  epfRate: number;
  payeSlabs: Array<{
    fromSalary: number;
    toSalary: number | null;
    taxRate: number;
    sortOrder: number;
  }>;
}): Promise<BuiltLine> {
  const meta = await resolveStaffMeta(args.staff);
  const workingDaysWork = inclusiveDayCount(args.workedFrom, args.workedTo);

  const structures = await prisma.salaryStructure.findMany({
    where: {
      status: 'active',
      staffCategoryId: meta.staffCategoryId || undefined,
      designationId: meta.designationId || undefined,
      effectiveFrom: { lte: args.salaryTo },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: args.salaryFrom } }]
    },
    orderBy: [{ effectiveFrom: 'desc' }]
  });

  const structure =
    structures.find(
      (row) =>
        (!row.departmentId ||
          row.departmentId === '__all__' ||
          row.departmentId === meta.departmentId) &&
        (!row.institutionId ||
          row.institutionId === '' ||
          row.institutionId === meta.institutionId ||
          row.institutionId === String(meta.institutionId))
    ) ?? null;

  let basic = structure?.basicSalary ?? 0;
  const components: LineComponent[] = [];
  let allowances = 0;
  let otherEarnings = 0;
  let otherDeductions = 0;

  if (structure) {
    for (const line of structure.lines) {
      const amount =
        line.calcMethod === 'fixed'
          ? Number(line.value) || 0
          : line.calcMethod === 'percent_of_basic'
            ? roundMoney(basic * (Number(line.value) || 0) / 100)
            : 0;
      if (!amount) continue;
      const section =
        line.section === 'deductions' ||
        line.section === 'employerContributions'
          ? 'deductions'
          : 'earnings';
      components.push({
        source: 'structure',
        componentId: line.componentId ?? null,
        name: line.name,
        typeId: '',
        section,
        amount
      });
      if (section === 'earnings') {
        if (line.name.toLowerCase().includes('basic')) {
          // already in basicSalary field
        } else {
          allowances += amount;
        }
      } else if (line.section === 'deductions') {
        otherDeductions += amount;
      }
    }
  }

  const assignments = await prisma.paysheetAssignment.findMany({
    where: {
      staffId: meta.staffId,
      effectiveFrom: { lte: args.salaryTo },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: args.salaryFrom } }]
    },
    select: {
      id: true,
      componentId: true,
      componentName: true,
      value: true
    }
  });

  const componentIds = [
    ...new Set(assignments.map((row) => row.componentId).filter(Boolean))
  ];
  const componentRows = componentIds.length
    ? await prisma.paysheetComponent.findMany({
        where: { id: { in: componentIds } },
        select: {
          id: true,
          name: true,
          typeId: true,
          percentage: true,
          includedForIds: true
        }
      })
    : [];
  const componentById = new Map(componentRows.map((row) => [row.id, row]));

  let epfWageBase = basic;

  for (const assignment of assignments) {
    const component = componentById.get(assignment.componentId);
    const typeId = component?.typeId ?? '';
    const name = component?.name || assignment.componentName || 'Component';
    let amount = assignment.value;

    if (typeId === 'percentage_allowance' || (component?.percentage ?? 0) > 0) {
      const pct = Number(component?.percentage || assignment.value) || 0;
      amount = roundMoney(basic * asRateFraction(pct));
    }

    if (typeId === 'basic_salary') {
      basic = amount;
      epfWageBase = amount;
      components.push({
        source: 'assignment',
        componentId: assignment.componentId,
        name,
        typeId,
        section: 'earnings',
        amount
      });
      continue;
    }

    if (
      typeId === 'fixed_allowance' ||
      typeId === 'percentage_allowance'
    ) {
      allowances += amount;
      components.push({
        source: 'assignment',
        componentId: assignment.componentId,
        name,
        typeId,
        section: 'earnings',
        amount
      });
      if (component?.includedForIds?.includes('epf')) {
        epfWageBase += amount;
      }
      continue;
    }

    if (typeId === 'fixed_deduction') {
      otherDeductions += amount;
      components.push({
        source: 'assignment',
        componentId: assignment.componentId,
        name,
        typeId,
        section: 'deductions',
        amount
      });
      continue;
    }

    if (typeId === 'ot') {
      // OT from attendance — leave for later engine; keep assignment value if present
      otherEarnings += amount;
      components.push({
        source: 'assignment',
        componentId: assignment.componentId,
        name,
        typeId,
        section: 'earnings',
        amount
      });
    }
  }

  const performanceRows = await prisma.performanceAllowance.findMany({
    where: {
      staffId: meta.staffId,
      effectiveFrom: { lte: args.salaryTo },
      effectiveTo: { gte: args.salaryFrom }
    },
    select: { id: true, mode: true, value: true }
  });

  for (const row of performanceRows) {
    const amount =
      row.mode === 'percentage'
        ? roundMoney(basic * (row.value / 100))
        : roundMoney(row.value);
    if (!amount) continue;
    allowances += amount;
    components.push({
      source: 'performance',
      componentId: row.id,
      name:
        row.mode === 'percentage'
          ? `Performance (${row.value}%)`
          : 'Performance allowance',
      typeId: 'performance',
      section: 'earnings',
      amount
    });
  }

  const loanRows = await prisma.loanAdvance.findMany({
    where: {
      staffId: meta.staffId,
      completed: false,
      fromDate: { lte: args.salaryTo },
      toDate: { gte: args.salaryFrom }
    },
    select: {
      id: true,
      componentId: true,
      componentName: true,
      monthlyInstallment: true,
      outstanding: true,
      loanNumber: true
    }
  });

  let loans = 0;
  for (const loan of loanRows) {
    const amount = roundMoney(
      Math.min(
        loan.monthlyInstallment,
        loan.outstanding > 0 ? loan.outstanding : loan.monthlyInstallment
      )
    );
    if (!amount) continue;
    loans += amount;
    components.push({
      source: 'loan',
      componentId: loan.id,
      name: `${loan.componentName || 'Loan'} (${loan.loanNumber})`,
      typeId: 'loan',
      section: 'deductions',
      amount
    });
  }

  const ot = 0;
  const gross = roundMoney(basic + allowances + ot + otherEarnings);
  const epf8 = roundMoney(Math.max(0, epfWageBase) * args.epfRate);
  const paye = computePaye(Math.max(0, gross - epf8), args.payeSlabs);
  const net = roundMoney(
    gross - epf8 - paye - loans - otherDeductions
  );

  return {
    staffId: meta.staffId,
    staffCode: meta.staffCode,
    staffName: meta.staffName,
    roster: meta.roster,
    rosterId: meta.rosterId,
    designation: meta.designation,
    designationId: meta.designationId,
    department: meta.department,
    departmentId: meta.departmentId,
    institution: meta.institution,
    institutionId: meta.institutionId,
    staffCategory: meta.staffCategory,
    staffCategoryId: meta.staffCategoryId,
    resignDate: meta.resignDate,
    workingDaysPh: 0,
    workingDaysWork,
    basic: roundMoney(basic),
    allowances: roundMoney(allowances),
    ot,
    otherEarnings: roundMoney(otherEarnings),
    gross,
    epf8,
    epf12: 0,
    etf3: 0,
    paye,
    loans: roundMoney(loans),
    otherDeductions: roundMoney(otherDeductions),
    net,
    structureId: structure?.id ?? null,
    structureCode: structure?.code ?? '',
    structureName: structure?.name ?? '',
    components
  };
}

async function persistLines(payrollRunId: string, lines: BuiltLine[]) {
  await prisma.payrollRunLine.deleteMany({ where: { payrollRunId } });
  if (!lines.length) return;

  // createMany does not support embedded types reliably on all adapters — create in chunks
  const chunkSize = 25;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((line) =>
        prisma.payrollRunLine.create({
          data: {
            payrollRunId,
            staffId: line.staffId,
            staffCode: line.staffCode,
            staffName: line.staffName,
            roster: line.roster,
            rosterId: line.rosterId,
            designation: line.designation,
            designationId: line.designationId,
            department: line.department,
            departmentId: line.departmentId,
            institution: line.institution,
            institutionId: line.institutionId,
            staffCategory: line.staffCategory,
            staffCategoryId: line.staffCategoryId,
            resignDate: line.resignDate,
            workingDaysPh: line.workingDaysPh,
            workingDaysWork: line.workingDaysWork,
            basic: line.basic,
            allowances: line.allowances,
            ot: line.ot,
            otherEarnings: line.otherEarnings,
            gross: line.gross,
            epf8: line.epf8,
            epf12: line.epf12,
            etf3: line.etf3,
            paye: line.paye,
            loans: line.loans,
            otherDeductions: line.otherDeductions,
            net: line.net,
            lineStatus: 'pending',
            structureId: line.structureId,
            structureCode: line.structureCode,
            structureName: line.structureName,
            components: line.components
          }
        })
      )
    );
  }
}

async function loadRunResult(runId: string): Promise<SalaryGenerationResult | null> {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) return null;
  const lines = await prisma.payrollRunLine.findMany({
    where: { payrollRunId: runId },
    orderBy: [{ staffName: 'asc' }, { staffCode: 'asc' }]
  });
  return {
    run: mapRunRecord(run),
    staffRows: lines.map(mapStaffRow),
    previewRows: lines.map(mapPreviewRow)
  };
}

export async function generatePayrollRun(
  payload: GeneratePayrollRunPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryGenerationResult;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = generateSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const {
      salaryCycleId,
      salaryFromDate,
      salaryToDate,
      workedFromDate,
      workedToDate,
      fillMode,
      filters
    } = parsed.data;

    if (salaryToDate < salaryFromDate) {
      return {
        success: false,
        error: { message: 'Salary to date must be on or after salary from date' }
      };
    }
    if (workedToDate < workedFromDate) {
      return {
        success: false,
        error: { message: 'Worked to date must be on or after worked from date' }
      };
    }

    const cycle = await prisma.salaryCycle.findUnique({
      where: { id: salaryCycleId }
    });
    if (!cycle) {
      return { success: false, error: { message: 'Salary cycle not found' } };
    }

    const processed = await prisma.payrollRun.findFirst({
      where: {
        salaryCycleId,
        status: { in: ['processed', 'on_hold', 'paid'] }
      },
      select: { id: true, status: true, code: true }
    });
    if (processed) {
      return {
        success: false,
        error: {
          message: `Cycle already has a ${processed.status} run (${processed.code}). Clear is only available for draft/generated runs.`
        }
      };
    }

    const audit = toAuditUser(user);
    const institutionKey = String(cycle.institutionId);
    const cycleLabel = formatInstitutionCycleTitle(
      cycle.institutionId,
      salaryFromDate,
      salaryToDate
    );

    let run = await prisma.payrollRun.findFirst({
      where: {
        salaryCycleId,
        status: { in: ['draft', 'generated'] }
      }
    });

    if (!run) {
      const generated = await generateRecordCode(PAYROLL_RUN_CODE_PREFIX);
      if (!generated.success) {
        return {
          success: false,
          error: { message: 'Failed to allocate payroll run code' }
        };
      }
      run = await prisma.payrollRun.create({
        data: {
          code: generated.code,
          salaryCycleId,
          cycleLabel,
          institutionId: cycle.institutionId,
          institution: getInstitutionName(cycle.institutionId),
          salaryFromDate,
          salaryToDate,
          workedFromDate,
          workedToDate,
          status: 'draft',
          createdBy: audit?.id,
          updatedBy: audit?.id
        }
      });
    } else {
      run = await prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          cycleLabel,
          salaryFromDate,
          salaryToDate,
          workedFromDate,
          workedToDate,
          status: 'draft',
          updatedBy: audit?.id
        }
      });
    }

    const existingLines = await prisma.payrollRunLine.findMany({
      where: { payrollRunId: run.id },
      select: { staffId: true }
    });
    const existingStaffIds = new Set(existingLines.map((row) => row.staffId));

    const hrm = await prisma.hrmVariable.findFirst({
      include: { slabs: true }
    });
    const epfRate = asRateFraction(hrm?.epfEmployee ?? 0);
    const payeSlabs = (hrm?.slabs ?? []).map((slab) => ({
      fromSalary: slab.fromSalary,
      toSalary: slab.toSalary,
      taxRate: slab.taxRate,
      sortOrder: slab.sortOrder
    }));

    const candidates = await loadCandidateStaff({
      institutionKey,
      salaryFrom: salaryFromDate,
      salaryTo: salaryToDate,
      fillMode: fillMode ?? 'all',
      filters,
      existingStaffIds
    });

    const built: BuiltLine[] = [];
    for (const staff of candidates) {
      built.push(
        await buildLineForStaff({
          staff,
          salaryFrom: salaryFromDate,
          salaryTo: salaryToDate,
          workedFrom: workedFromDate,
          workedTo: workedToDate,
          epfRate,
          payeSlabs
        })
      );
    }

    // Merge modes: generated/not-generated may keep existing lines
    let finalLines = built;
    if (fillMode === 'not-generated' && existingLines.length) {
      const kept = await prisma.payrollRunLine.findMany({
        where: { payrollRunId: run.id }
      });
      const keptBuilt: BuiltLine[] = kept.map((line) => ({
        staffId: line.staffId,
        staffCode: line.staffCode,
        staffName: line.staffName,
        roster: line.roster,
        rosterId: line.rosterId,
        designation: line.designation,
        designationId: line.designationId,
        department: line.department,
        departmentId: line.departmentId,
        institution: line.institution,
        institutionId: line.institutionId,
        staffCategory: line.staffCategory,
        staffCategoryId: line.staffCategoryId,
        resignDate: line.resignDate,
        workingDaysPh: line.workingDaysPh,
        workingDaysWork: line.workingDaysWork,
        basic: line.basic,
        allowances: line.allowances,
        ot: line.ot,
        otherEarnings: line.otherEarnings,
        gross: line.gross,
        epf8: line.epf8,
        epf12: line.epf12 ?? 0,
        etf3: line.etf3 ?? 0,
        paye: line.paye,
        loans: line.loans,
        otherDeductions: line.otherDeductions,
        net: line.net,
        structureId: line.structureId,
        structureCode: line.structureCode,
        structureName: line.structureName,
        components: line.components.map((c) => ({
          source: c.source,
          componentId: c.componentId,
          name: c.name,
          typeId: c.typeId,
          section: c.section,
          amount: c.amount
        }))
      }));
      finalLines = [...keptBuilt, ...built];
    } else if (fillMode === 'generated') {
      // rebuild only previously generated staff (built already filtered)
      finalLines = built;
    }

    await persistLines(run.id, finalLines);
    const { totals } = buildBreakdowns(finalLines);

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        staffCount: finalLines.length,
        totalEarnings: totals.totalEarnings,
        totalDeductions: totals.totalDeductions,
        netPayable: totals.netPayable,
        totalBasic: totals.totalBasic,
        totalAllowances: totals.totalAllowances,
        totalOt: totals.totalOt,
        totalOtherEarnings: totals.totalOtherEarnings,
        totalEpf8: totals.totalEpf8,
        totalPaye: totals.totalPaye,
        totalLoans: totals.totalLoans,
        totalOtherDeductions: totals.totalOtherDeductions,
        updatedBy: audit?.id
      }
    });

    const result = await loadRunResult(run.id);
    if (!result) {
      return { success: false, error: { message: 'Failed to reload payroll run' } };
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error('generatePayrollRun error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to generate payroll run' }
    };
  }
}

export async function savePayrollRun(
  runId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryGenerationResult;
  error?: { message?: string };
}> {
  try {
    const existing = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!existing) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    if (existing.status !== 'draft' && existing.status !== 'generated') {
      return {
        success: false,
        error: { message: `Cannot save a ${existing.status} run from generation` }
      };
    }
    if (existing.staffCount <= 0) {
      return {
        success: false,
        error: { message: 'Generate staff salary lines before saving' }
      };
    }

    const audit = toAuditUser(user);
    await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'generated',
        updatedBy: audit?.id
      }
    });

    const result = await loadRunResult(runId);
    if (!result) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error('savePayrollRun error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to save payroll run' }
    };
  }
}

export async function clearPayrollRun(
  runId: string
): Promise<{
  success: boolean;
  data?: { deleted: boolean };
  error?: { message?: string };
}> {
  try {
    const existing = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!existing) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    if (!['draft', 'generated'].includes(existing.status)) {
      return {
        success: false,
        error: {
          message: `Cannot clear a ${existing.status} run from Salary Generation`
        }
      };
    }

    await prisma.payrollRunLine.deleteMany({ where: { payrollRunId: runId } });
    await prisma.payrollRun.delete({ where: { id: runId } });
    return { success: true, data: { deleted: true } };
  } catch (error: any) {
    console.error('clearPayrollRun error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to clear payroll run' }
    };
  }
}

export async function getPayrollRunById(
  runId: string
): Promise<{
  success: boolean;
  data?: SalaryGenerationResult;
  error?: { message?: string };
}> {
  try {
    const result = await loadRunResult(runId);
    if (!result) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error('getPayrollRunById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load payroll run' }
    };
  }
}

export async function getActivePayrollRunForCycle(
  salaryCycleId: string
): Promise<{
  success: boolean;
  data?: SalaryGenerationResult | null;
  error?: { message?: string };
}> {
  try {
    const run = await prisma.payrollRun.findFirst({
      where: {
        salaryCycleId,
        status: { in: ['draft', 'generated'] }
      },
      orderBy: { updatedAt: 'desc' }
    });
    if (!run) return { success: true, data: null };
    const result = await loadRunResult(run.id);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('getActivePayrollRunForCycle error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load payroll run' }
    };
  }
}

export async function getPayrollRunStaffExportRows(
  runId: string
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  error?: { message?: string };
}> {
  try {
    const lines = await prisma.payrollRunLine.findMany({
      where: { payrollRunId: runId },
      orderBy: [{ staffName: 'asc' }, { staffCode: 'asc' }]
    });
    return {
      success: true,
      data: lines.map((line) => ({
        roster: line.roster || '—',
        resignedDate: toIsoString(line.resignDate)?.slice(0, 10) ?? '—',
        workingDaysPh: String(line.workingDaysPh),
        workingDaysWork: String(line.workingDaysWork),
        designation: line.designation || '—',
        code: line.staffCode || '—',
        name: line.staffName || '—'
      }))
    };
  } catch (error: any) {
    console.error('getPayrollRunStaffExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Export failed' }
    };
  }
}

export async function getPayrollRunPreviewExportRows(
  runId: string
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  error?: { message?: string };
}> {
  try {
    const lines = await prisma.payrollRunLine.findMany({
      where: { payrollRunId: runId },
      orderBy: [{ staffName: 'asc' }, { staffCode: 'asc' }]
    });
    return {
      success: true,
      data: lines.map((line) => ({
        employee: `${line.staffName} (${line.staffCode})`,
        basic: String(line.basic),
        allowances: String(line.allowances),
        ot: String(line.ot),
        gross: String(line.gross),
        epf8: String(line.epf8),
        paye: String(line.paye),
        loans: String(line.loans),
        net: String(line.net)
      }))
    };
  } catch (error: any) {
    console.error('getPayrollRunPreviewExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Export failed' }
    };
  }
}

/** Empty chart defaults for UI when no run is loaded. */
function emptyGenerationCharts(): {
  earningsBreakdown: SalaryBreakdownChartPoint[];
  deductionsBreakdown: SalaryBreakdownChartPoint[];
} {
  return {
    earningsBreakdown: EMPTY_EARNINGS_BREAKDOWN.map((p) => ({ ...p })),
    deductionsBreakdown: EMPTY_DEDUCTIONS_BREAKDOWN.map((p) => ({ ...p }))
  };
}
