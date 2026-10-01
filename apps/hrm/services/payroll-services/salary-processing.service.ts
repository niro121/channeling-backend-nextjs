'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers
} from '@/lib/helpers/resolve-auth-users.helper';
import { format } from 'date-fns';
import {
  EMPTY_SALARY_PROCESSING_SUMMARY,
  SALARY_PROCESSING_WIZARD_STEP_DEFS,
  type PayrollRunStatus,
  type SalaryProcessingBreakdownRow,
  type SalaryProcessingRunOption,
  type SalaryProcessingSummary,
  type SalaryProcessingWizardStep,
  type SalaryProcessingWorkspaceData
} from '@/types/payroll';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function asRateFraction(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1 ? value / 100 : value;
}

function computePaye(
  taxable: number,
  slabs: Array<{
    fromSalary: number;
    toSalary: number | null;
    taxRate: number;
    sortOrder: number;
  }>
): number {
  if (taxable <= 0 || slabs.length === 0) return 0;
  const ordered = [...slabs].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.fromSalary - b.fromSalary
  );
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

function periodLabel(from: Date, to: Date): string {
  try {
    return `${format(from, 'dd MMM yyyy')} – ${format(to, 'dd MMM yyyy')}`;
  } catch {
    return '—';
  }
}

/** Map run status → wizard current step (1–8). */
export function wizardCurrentStepForStatus(
  status: PayrollRunStatus,
  calculated: boolean
): number {
  if (status === 'processed' || status === 'paid') return 8;
  if (status === 'on_hold') return 7;
  if (status === 'generated' && calculated) return 6;
  if (status === 'generated') return 3;
  return 1;
}

export function buildWizardSteps(
  status: PayrollRunStatus,
  calculated: boolean,
  overrideCurrentStepId?: number
): { steps: SalaryProcessingWizardStep[]; currentStepId: number } {
  const currentStepId =
    overrideCurrentStepId ?? wizardCurrentStepForStatus(status, calculated);

  const steps = SALARY_PROCESSING_WIZARD_STEP_DEFS.map((step) => {
    let stepStatus: SalaryProcessingWizardStep['status'] = 'pending';
    if (step.id < currentStepId) stepStatus = 'completed';
    else if (step.id === currentStepId) stepStatus = 'current';
    return { ...step, status: stepStatus };
  });

  return { steps, currentStepId };
}

function mapBreakdownRow(line: {
  id: string;
  staffId: string;
  staffName: string;
  staffCode: string;
  basic: number;
  ot: number;
  allowances: number;
  epf8: number;
  epf12: number;
  etf3: number;
  paye: number;
  loans: number;
  otherDeductions: number;
  net: number;
  lineStatus: string;
}): SalaryProcessingBreakdownRow {
  const deductions = roundMoney(
    line.epf8 + line.paye + line.loans + line.otherDeductions
  );
  return {
    id: line.id,
    staffId: line.staffId,
    staffName: line.staffName,
    staffCode: line.staffCode,
    basic: line.basic,
    ot: line.ot,
    allowances: line.allowances,
    deductions,
    epf8: line.epf8,
    epf12: line.epf12,
    etf3: line.etf3,
    paye: line.paye,
    loans: line.loans,
    netSalary: line.net,
    lineStatus: line.lineStatus
  };
}

function isCalculated(lines: Array<{ epf12: number; etf3: number }>): boolean {
  return lines.some((line) => line.epf12 > 0 || line.etf3 > 0);
}

async function loadWorkspace(
  runId: string,
  overrideCurrentStepId?: number
): Promise<SalaryProcessingWorkspaceData | null> {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) return null;

  const lines = await prisma.payrollRunLine.findMany({
    where: { payrollRunId: runId },
    orderBy: [{ staffName: 'asc' }, { staffCode: 'asc' }]
  });

  const users = await resolveAuthUsers([
    {
      createdBy: run.createdBy,
      updatedBy: run.updatedBy ?? run.processedBy
    }
  ]);
  const userRow = users[0];

  const calculated = isCalculated(lines);
  const status = run.status as PayrollRunStatus;
  const { steps, currentStepId } = buildWizardSteps(
    status,
    calculated,
    overrideCurrentStepId
  );

  const totalEpf8 = lines.reduce((s, l) => s + l.epf8, 0);
  const totalEpf12 = lines.reduce((s, l) => s + (l.epf12 ?? 0), 0);
  const totalEtf3 = lines.reduce((s, l) => s + (l.etf3 ?? 0), 0);

  const summary: SalaryProcessingSummary = {
    periodLabel: periodLabel(run.salaryFromDate, run.salaryToDate),
    staffCount: run.staffCount,
    initiatedBy: userRow?.createdUser?.name ?? null,
    runId: run.id,
    runCode: run.code,
    runStatus: status,
    grossSalary: run.totalEarnings,
    totalDeductions: run.totalDeductions,
    netPayable: run.netPayable,
    epfEtf: roundMoney(totalEpf8 + totalEpf12 + totalEtf3)
  };

  return {
    runId: run.id,
    runCode: run.code,
    runStatus: status,
    summary,
    rows: lines.map(mapBreakdownRow),
    wizardSteps: steps,
    currentStepId
  };
}

export async function listProcessablePayrollRuns(): Promise<{
  success: boolean;
  data?: SalaryProcessingRunOption[];
  error?: { message?: string };
}> {
  try {
    const rows = await prisma.payrollRun.findMany({
      where: {
        status: { in: ['generated', 'on_hold', 'processed'] }
      },
      orderBy: [{ salaryFromDate: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        code: true,
        cycleLabel: true,
        status: true,
        salaryCycleId: true,
        staffCount: true,
        salaryFromDate: true,
        salaryToDate: true
      }
    });

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: `${row.code} · ${row.cycleLabel || periodLabel(row.salaryFromDate, row.salaryToDate)} · ${row.status}`,
        status: row.status as PayrollRunStatus,
        salaryCycleId: row.salaryCycleId,
        staffCount: row.staffCount
      }))
    };
  } catch (error: any) {
    console.error('listProcessablePayrollRuns error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to list payroll runs' }
    };
  }
}

export async function getSalaryProcessingWorkspace(
  runId: string
): Promise<{
  success: boolean;
  data?: SalaryProcessingWorkspaceData;
  error?: { message?: string };
}> {
  try {
    const data = await loadWorkspace(runId);
    if (!data) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('getSalaryProcessingWorkspace error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load processing workspace' }
    };
  }
}

export async function recalculatePayrollStatutory(
  runId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryProcessingWorkspaceData;
  error?: { message?: string };
}> {
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    if (!['generated', 'on_hold'].includes(run.status)) {
      return {
        success: false,
        error: {
          message: `Cannot recalculate a ${run.status} run`
        }
      };
    }

    const hrm = await prisma.hrmVariable.findFirst({
      include: { slabs: true }
    });
    const epfEmployee = asRateFraction(hrm?.epfEmployee ?? 0);
    const epfCompany = asRateFraction(hrm?.epfCompany ?? 0);
    const etfCompany = asRateFraction(hrm?.etfCompany ?? 0);
    const payeSlabs = (hrm?.slabs ?? []).map((slab) => ({
      fromSalary: slab.fromSalary,
      toSalary: slab.toSalary,
      taxRate: slab.taxRate,
      sortOrder: slab.sortOrder
    }));

    const lines = await prisma.payrollRunLine.findMany({
      where: { payrollRunId: runId }
    });

    let totalEarnings = 0;
    let totalDeductions = 0;
    let netPayable = 0;
    let totalEpf8 = 0;
    let totalEpf12 = 0;
    let totalEtf3 = 0;
    let totalPaye = 0;
    let totalLoans = 0;
    let totalOtherDeductions = 0;
    let totalBasic = 0;
    let totalAllowances = 0;
    let totalOt = 0;
    let totalOtherEarnings = 0;

    for (const line of lines) {
      // Prefer reverse-engineered wage base from existing employee EPF when rate known
      let wageBase = line.basic + line.allowances;
      if (epfEmployee > 0 && line.epf8 > 0) {
        wageBase = Math.max(wageBase, roundMoney(line.epf8 / epfEmployee));
      }

      const epf8 = roundMoney(Math.max(0, wageBase) * epfEmployee);
      const epf12 = roundMoney(Math.max(0, wageBase) * epfCompany);
      const etf3 = roundMoney(Math.max(0, wageBase) * etfCompany);
      const paye = computePaye(Math.max(0, line.gross - epf8), payeSlabs);
      const net = roundMoney(
        line.gross - epf8 - paye - line.loans - line.otherDeductions
      );

      await prisma.payrollRunLine.update({
        where: { id: line.id },
        data: {
          epf8,
          epf12,
          etf3,
          paye,
          net,
          lineStatus: line.lineStatus === 'on_hold' ? 'on_hold' : 'pending'
        }
      });

      totalBasic += line.basic;
      totalAllowances += line.allowances;
      totalOt += line.ot;
      totalOtherEarnings += line.otherEarnings;
      totalEarnings += line.gross;
      totalEpf8 += epf8;
      totalEpf12 += epf12;
      totalEtf3 += etf3;
      totalPaye += paye;
      totalLoans += line.loans;
      totalOtherDeductions += line.otherDeductions;
      totalDeductions += epf8 + paye + line.loans + line.otherDeductions;
      netPayable += net;
    }

    const audit = toAuditUser(user);
    await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: run.status === 'on_hold' ? 'on_hold' : 'generated',
        totalBasic: roundMoney(totalBasic),
        totalAllowances: roundMoney(totalAllowances),
        totalOt: roundMoney(totalOt),
        totalOtherEarnings: roundMoney(totalOtherEarnings),
        totalEarnings: roundMoney(totalEarnings),
        totalDeductions: roundMoney(totalDeductions),
        netPayable: roundMoney(netPayable),
        totalEpf8: roundMoney(totalEpf8),
        totalEpf12: roundMoney(totalEpf12),
        totalEtf3: roundMoney(totalEtf3),
        totalPaye: roundMoney(totalPaye),
        totalLoans: roundMoney(totalLoans),
        totalOtherDeductions: roundMoney(totalOtherDeductions),
        updatedBy: audit?.id
      }
    });

    const data = await loadWorkspace(runId, 5);
    if (!data) {
      return { success: false, error: { message: 'Failed to reload workspace' } };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('recalculatePayrollStatutory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to recalculate statutory amounts' }
    };
  }
}

async function applyLoanWritebacks(runId: string): Promise<number> {
  const lines = await prisma.payrollRunLine.findMany({
    where: { payrollRunId: runId },
    select: { components: true }
  });

  let applied = 0;
  for (const line of lines) {
    for (const component of line.components) {
      if (component.source !== 'loan' || !component.componentId) continue;
      const loan = await prisma.loanAdvance.findUnique({
        where: { id: component.componentId },
        select: {
          id: true,
          outstanding: true,
          monthlyInstallment: true,
          completed: true
        }
      });
      if (!loan || loan.completed) continue;

      const deduct = Math.min(
        component.amount,
        loan.outstanding > 0 ? loan.outstanding : component.amount
      );
      const nextOutstanding = roundMoney(Math.max(0, loan.outstanding - deduct));
      await prisma.loanAdvance.update({
        where: { id: loan.id },
        data: {
          outstanding: nextOutstanding,
          completed: nextOutstanding <= 0,
          completionDate: nextOutstanding <= 0 ? new Date() : undefined
        }
      });
      applied += 1;
    }
  }
  return applied;
}

export async function approvePayrollRun(
  runId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryProcessingWorkspaceData;
  error?: { message?: string };
}> {
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    if (!['generated', 'on_hold'].includes(run.status)) {
      return {
        success: false,
        error: { message: `Cannot approve a ${run.status} run` }
      };
    }
    if (run.staffCount <= 0) {
      return {
        success: false,
        error: { message: 'Payroll run has no staff lines' }
      };
    }

    // Ensure statutory employer amounts exist
    if (run.totalEpf12 <= 0 && run.totalEtf3 <= 0) {
      const recalc = await recalculatePayrollStatutory(runId, user);
      if (!recalc.success) return recalc;
    }

    const audit = toAuditUser(user);
    if (!run.loansApplied) {
      await applyLoanWritebacks(runId);
    }

    await prisma.payrollRunLine.updateMany({
      where: { payrollRunId: runId, lineStatus: { not: 'on_hold' } },
      data: { lineStatus: 'approved' }
    });

    await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'processed',
        loansApplied: true,
        processedAt: new Date(),
        processedBy: audit?.id,
        holdReason: '',
        updatedBy: audit?.id
      }
    });

    const data = await loadWorkspace(runId, 8);
    if (!data) {
      return { success: false, error: { message: 'Failed to reload workspace' } };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('approvePayrollRun error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to approve payroll run' }
    };
  }
}

export async function holdPayrollRun(
  runId: string,
  reason = '',
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryProcessingWorkspaceData;
  error?: { message?: string };
}> {
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    if (!['generated', 'on_hold'].includes(run.status)) {
      return {
        success: false,
        error: { message: `Cannot hold a ${run.status} run` }
      };
    }

    const audit = toAuditUser(user);
    await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'on_hold',
        holdReason: reason.trim(),
        updatedBy: audit?.id
      }
    });

    const data = await loadWorkspace(runId, 7);
    if (!data) {
      return { success: false, error: { message: 'Failed to reload workspace' } };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('holdPayrollRun error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to put payroll on hold' }
    };
  }
}

export async function releasePayrollRunHold(
  runId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: SalaryProcessingWorkspaceData;
  error?: { message?: string };
}> {
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    if (run.status !== 'on_hold') {
      return {
        success: false,
        error: { message: 'Run is not on hold' }
      };
    }

    const audit = toAuditUser(user);
    await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'generated',
        holdReason: '',
        updatedBy: audit?.id
      }
    });

    const data = await loadWorkspace(runId, 6);
    if (!data) {
      return { success: false, error: { message: 'Failed to reload workspace' } };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('releasePayrollRunHold error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to release hold' }
    };
  }
}

export async function getSalaryProcessingExportRows(
  runId: string
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  error?: { message?: string };
}> {
  try {
    const data = await loadWorkspace(runId);
    if (!data) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    return {
      success: true,
      data: data.rows.map((row) => ({
        staffName: row.staffName || '—',
        staffCode: row.staffCode || '—',
        basic: String(row.basic),
        ot: String(row.ot),
        allowances: String(row.allowances),
        deductions: String(row.deductions),
        epf12: String(row.epf12),
        etf3: String(row.etf3),
        paye: String(row.paye),
        netSalary: String(row.netSalary)
      }))
    };
  } catch (error: any) {
    console.error('getSalaryProcessingExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Export failed' }
    };
  }
}

export function emptyProcessingWorkspace(): {
  summary: SalaryProcessingSummary;
  rows: SalaryProcessingBreakdownRow[];
  wizardSteps: SalaryProcessingWizardStep[];
  currentStepId: number;
} {
  const { steps, currentStepId } = buildWizardSteps('draft', false, 1);
  return {
    summary: EMPTY_SALARY_PROCESSING_SUMMARY,
    rows: [],
    wizardSteps: steps,
    currentStepId
  };
}
