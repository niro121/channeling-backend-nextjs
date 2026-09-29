export type SalaryGenerationTab = 'cycle' | 'staff-list' | 'staff-salary';

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

/** Salary Processing — payroll wizard steps (Phase 0 UI shell). */
export type SalaryProcessingStepStatus = 'completed' | 'current' | 'pending';

export type SalaryProcessingWizardStep = {
  id: number;
  label: string;
  status: SalaryProcessingStepStatus;
};

export type SalaryProcessingSummary = {
  periodLabel: string | null;
  staffCount: number;
  initiatedBy: string | null;
  grossSalary: number;
  totalDeductions: number;
  netPayable: number;
  epfEtf: number;
};

export type SalaryProcessingBreakdownRow = {
  id: string;
  staffName: string;
  staffCode: string;
  basic: number;
  ot: number;
  allowances: number;
  deductions: number;
  epf12: number;
  etf3: number;
  paye: number;
  netSalary: number;
};

export const SALARY_PROCESSING_WIZARD_STEPS: SalaryProcessingWizardStep[] = [
  { id: 1, label: 'Select Month', status: 'completed' },
  { id: 2, label: 'Load Attendance', status: 'completed' },
  { id: 3, label: 'Calculate Salary', status: 'completed' },
  { id: 4, label: 'Review Allowances', status: 'completed' },
  { id: 5, label: 'Review Deductions', status: 'current' },
  { id: 6, label: 'Generate Payslips', status: 'pending' },
  { id: 7, label: 'Approve Payroll', status: 'pending' },
  { id: 8, label: 'Export Bank File', status: 'pending' }
];

export const EMPTY_SALARY_PROCESSING_SUMMARY: SalaryProcessingSummary = {
  periodLabel: null,
  staffCount: 0,
  initiatedBy: null,
  grossSalary: 0,
  totalDeductions: 0,
  netPayable: 0,
  epfEtf: 0
};

/** Assign Paysheet Component — Phase 0 UI shell. */
export type PaysheetAssignmentStatus = 'active' | 'expiring' | 'ended';

export type PaysheetStaffOption = {
  id: string;
  name: string;
  code?: string;
};

export type PaysheetAssignmentFilters = {
  staffId?: string;
  staffCode?: string;
  epfNumber?: string;
  componentId?: string;
  fromDate?: string;
  toDate?: string;
  departmentId?: string;
  institution?: string;
  staffCategory?: string;
  designationId?: string;
  rosterId?: string;
};

export type PaysheetAssignmentRecord = {
  id: string;
  staffId: string;
  institution: string;
  department: string;
  roster: string;
  staffCode: string;
  staffName: string;
  componentId: string;
  componentName: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  grade: string;
  staffCategory: string;
  designation: string;
  status: PaysheetAssignmentStatus;
  value: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type PaysheetAssignmentFormValues = {
  staffId: string;
  staffCode: string;
  componentId: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  value: string;
};

export const EMPTY_PAYSHEET_ASSIGNMENT_FORM: PaysheetAssignmentFormValues = {
  staffId: '',
  staffCode: '',
  componentId: '',
  effectiveFrom: null,
  effectiveTo: null,
  value: '0'
};

/** Bulk assign paysheet component — Phase 0 UI shell. */
export type BulkPaysheetStaffFilters = {
  staffId?: string;
  departmentId?: string;
  institution?: string;
  staffCategory?: string;
  designationId?: string;
  rosterId?: string;
};

export type BulkPaysheetStaffRow = {
  id: string;
  staffCode: string;
  staffName: string;
  department: string;
  institution: string;
  designation: string;
  staffCategory: string;
  grade: string;
  roster: string;
};

export type BulkPaysheetSummary = {
  selected: number;
  totalMatches: number;
  assignedThisBatch: number;
  removed: number;
};

export type BulkPaysheetAssignFormValues = {
  componentId: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  value: string;
};

export const EMPTY_BULK_PAYSHEET_SUMMARY: BulkPaysheetSummary = {
  selected: 0,
  totalMatches: 0,
  assignedThisBatch: 0,
  removed: 0
};

export const EMPTY_BULK_PAYSHEET_ASSIGN_FORM: BulkPaysheetAssignFormValues = {
  componentId: '',
  effectiveFrom: null,
  effectiveTo: null,
  value: '0'
};

/** Performance Allowance — Phase 0 UI shell. */
export type PerformanceAllowanceMode = 'percentage' | 'fixed';

export type PerformanceAllowanceFilters = {
  staffId?: string;
  departmentId?: string;
  designationId?: string;
  effectiveDate?: string;
};

export type PerformanceAllowanceRecord = {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  mode: PerformanceAllowanceMode;
  /** Percentage (e.g. 12.5) or fixed LKR amount depending on mode. */
  value: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type PerformanceAllowanceFormValues = {
  staffId: string;
  value: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

export type PerformanceAllowanceSummary = {
  staffOnAllowance: number;
  averageMetric: number;
  totalMonthlyValue: number;
};

export const EMPTY_PERFORMANCE_ALLOWANCE_FORM: PerformanceAllowanceFormValues = {
  staffId: '',
  value: '',
  effectiveFrom: null,
  effectiveTo: null
};

export const EMPTY_PERFORMANCE_ALLOWANCE_SUMMARY: PerformanceAllowanceSummary = {
  staffOnAllowance: 0,
  averageMetric: 0,
  totalMonthlyValue: 0
};

/** Loans & Advances — Phase 0 UI shell. */
export type LoanAdvanceStatus = 'active' | 'ongoing' | 'completed';

export type LoanAdvanceFilters = {
  fromDate?: string;
  componentId?: string;
  staffId?: string;
  departmentId?: string;
  institution?: string;
  staffCategory?: string;
  designationId?: string;
  rosterId?: string;
};

export type LoanAdvanceRecord = {
  id: string;
  componentId: string;
  componentName: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  institution: string;
  department: string;
  roster: string;
  grade: string;
  staffCategory: string;
  designation: string;
  resignDate: string | null;
  bankId: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  loanNumber: string;
  startingBalance: number;
  loanAmount: number;
  monthlyInstallment: number;
  outstanding: number;
  fromDate: string | null;
  toDate: string | null;
  comments: string;
  scheduleForPaid: boolean;
  completed: boolean;
  completionDate: string | null;
  status: LoanAdvanceStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type LoanAdvanceFormValues = {
  componentId: string;
  staffId: string;
  loanNumber: string;
  bankId: string;
  branch: string;
  accountNumber: string;
  startingBalance: string;
  loanAmount: string;
  monthlyInstallment: string;
  fromDate: Date | null;
  toDate: Date | null;
  comments: string;
  scheduleForPaid: boolean;
  completed: boolean;
  completionDate: Date | null;
};

export type LoanAdvanceSummary = {
  activeLoans: number;
  outstanding: number;
  thisMonthDeducted: number;
  completedYtd: number;
};

export const EMPTY_LOAN_ADVANCE_FORM: LoanAdvanceFormValues = {
  componentId: '',
  staffId: '',
  loanNumber: '',
  bankId: '',
  branch: '',
  accountNumber: '',
  startingBalance: '',
  loanAmount: '',
  monthlyInstallment: '',
  fromDate: null,
  toDate: null,
  comments: '',
  scheduleForPaid: false,
  completed: false,
  completionDate: null
};

export const EMPTY_LOAN_ADVANCE_SUMMARY: LoanAdvanceSummary = {
  activeLoans: 0,
  outstanding: 0,
  thisMonthDeducted: 0,
  completedYtd: 0
};

export const EMPTY_SALARY_GENERATION_CYCLE_VALUES: SalaryGenerationCycleFormValues =
  {
    salaryCycleId: '',
    salaryFromDate: null,
    salaryToDate: null,
    workedFromDate: null,
    workedToDate: null
  };
