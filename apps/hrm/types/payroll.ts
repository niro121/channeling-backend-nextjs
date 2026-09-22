import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths
} from 'date-fns';

export type SalaryGenerationTab = 'cycle' | 'staff-list' | 'staff-salary';

export type SalaryCycleOption = {
  id: string;
  name: string;
};

export type SalaryFilterOption = {
  id: string;
  name: string;
};

export type SalaryGenerationCycleFormValues = {
  salaryCycleId: string;
  salaryFromDate: Date | null;
  salaryToDate: Date | null;
  workedFromDate: Date | null;
  workedToDate: Date | null;
};

export type SalaryGenerationStaffFilters = {
  staffId?: string;
  institution?: string;
  departmentId?: string;
  staffCategory?: string;
  designationId?: string;
  rosterId?: string;
};

export type SalaryGenerationStaffRow = {
  id: string;
  roster: string;
  resignedDate: string | null;
  workingDaysPh: number;
  workingDaysWork: number;
  designation: string;
  code: string;
  name: string;
};

export type SalaryGenerationSummary = {
  totalEarnings: number;
  totalDeductions: number;
  netPayable: number;
  employeeCount: number;
};

export type SalaryBreakdownChartPoint = {
  category: string;
  amount: number;
};

export type SalaryGenerationPreviewRow = {
  id: string;
  employee: string;
  basic: number;
  allowances: number;
  ot: number;
  gross: number;
  epf8: number;
  paye: number;
  loans: number;
  net: number;
};

export const EMPTY_SALARY_GENERATION_SUMMARY: SalaryGenerationSummary = {
  totalEarnings: 0,
  totalDeductions: 0,
  netPayable: 0,
  employeeCount: 0
};

/** Fixed chart categories (Phase 0 shell — amounts stay 0 until dynamic phase). */
export const EMPTY_EARNINGS_BREAKDOWN: SalaryBreakdownChartPoint[] = [
  { category: 'Basic', amount: 0 },
  { category: 'Allowances', amount: 0 },
  { category: 'OT', amount: 0 },
  { category: 'Other', amount: 0 }
];

export const EMPTY_DEDUCTIONS_BREAKDOWN: SalaryBreakdownChartPoint[] = [
  { category: 'EPF 8%', amount: 0 },
  { category: 'PAYE', amount: 0 },
  { category: 'Loans', amount: 0 },
  { category: 'Other', amount: 0 }
];

export const EMPTY_SALARY_GENERATION_CYCLE_VALUES: SalaryGenerationCycleFormValues =
  {
    salaryCycleId: '',
    salaryFromDate: null,
    salaryToDate: null,
    workedFromDate: null,
    workedToDate: null
  };

/** Build cycle option id like `2026-03` from a month date. */
export function toSalaryCycleId(monthDate: Date): string {
  return format(monthDate, 'yyyy-MM');
}

/**
 * Default dates for a salary cycle month:
 * - Salary: 1st → last day of the cycle month
 * - Worked: 15th of previous month → 14th of the cycle month
 */
export function getDatesForSalaryCycle(cycleId: string): {
  salaryFromDate: Date;
  salaryToDate: Date;
  workedFromDate: Date;
  workedToDate: Date;
} | null {
  const match = /^(\d{4})-(\d{2})$/.exec(cycleId.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return null;

  const salaryFromDate = startOfMonth(new Date(year, monthIndex, 1));
  const salaryToDate = endOfMonth(salaryFromDate);
  const previousMonth = subMonths(salaryFromDate, 1);

  return {
    salaryFromDate,
    salaryToDate,
    workedFromDate: new Date(
      previousMonth.getFullYear(),
      previousMonth.getMonth(),
      15
    ),
    workedToDate: new Date(year, monthIndex, 14)
  };
}

/** Rolling month options for the cycle dropdown (UI helper, not sample payroll rows). */
export function buildSalaryCycleOptions(
  referenceDate: Date = new Date(),
  monthsBefore = 6,
  monthsAfter = 2
): SalaryCycleOption[] {
  const options: SalaryCycleOption[] = [];

  for (let offset = -monthsBefore; offset <= monthsAfter; offset += 1) {
    const monthDate = startOfMonth(addMonths(referenceDate, offset));
    const id = toSalaryCycleId(monthDate);
    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);
    options.push({
      id,
      name: `${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`
    });
  }

  return options;
}
