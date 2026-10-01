export type SalaryGenerationTab = 'cycle' | 'staff-list' | 'staff-salary';

export type SalaryFilterOption = {
  id: string;
  name: string;
};

export const PAYROLL_RUN_CODE_PREFIX = 'PRN';

export type PayrollRunStatus =
  | 'draft'
  | 'generated'
  | 'processed'
  | 'on_hold'
  | 'paid';

export type SalaryGenerationFillMode =
  | 'all'
  | 'not-generated'
  | 'generated'
  | 'resigned';

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

export type GeneratePayrollRunPayload = {
  salaryCycleId: string;
  salaryFromDate: Date | string;
  salaryToDate: Date | string;
  workedFromDate: Date | string;
  workedToDate: Date | string;
  fillMode?: SalaryGenerationFillMode;
  filters?: SalaryGenerationStaffFilters;
};

export type SalaryGenerationStaffRow = {
  id: string;
  staffId: string;
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

export type PayrollRunRecord = {
  id: string;
  code: string;
  salaryCycleId: string;
  cycleLabel: string;
  institutionId: number;
  institution: string;
  salaryFromDate: string;
  salaryToDate: string;
  workedFromDate: string;
  workedToDate: string;
  status: PayrollRunStatus;
  staffCount: number;
  summary: SalaryGenerationSummary;
  earningsBreakdown: SalaryBreakdownChartPoint[];
  deductionsBreakdown: SalaryBreakdownChartPoint[];
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SalaryGenerationResult = {
  run: PayrollRunRecord;
  staffRows: SalaryGenerationStaffRow[];
  previewRows: SalaryGenerationPreviewRow[];
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

/** Assign Paysheet Component — live CRUD over PaysheetAssignment. */
export const PAYSHEET_ASSIGNMENT_CODE_PREFIX = 'PSA';

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

export type GetPaysheetAssignmentParams = PaysheetAssignmentFilters & {
  page?: number;
  limit?: number;
};

export type PaysheetAssignmentRecord = {
  id: string;
  code: string;
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

export type PaysheetAssignmentPayload = {
  staffId: string;
  componentId: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  value: number;
};

export type PaysheetAssignmentHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type PaysheetAssignmentOverlap = {
  id: string;
  code: string;
  staffId: string;
  staffName: string;
  staffCode: string;
  componentName: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type BulkPaysheetAssignMode = 'create' | 'skip' | 'overwrite';

export type BulkPaysheetAssignPayload = {
  staffIds: string[];
  componentId: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  value: number;
  mode: BulkPaysheetAssignMode;
};

export type BulkPaysheetAssignResult = {
  created: PaysheetAssignmentRecord[];
  skipped: number;
  overwritten: number;
  overlaps: PaysheetAssignmentOverlap[];
};

export type GetBulkAssignableStaffParams = BulkPaysheetStaffFilters & {
  page?: number;
  limit?: number;
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

/** Performance Allowance — separate collection (M6). */
export const PERFORMANCE_ALLOWANCE_CODE_PREFIX = 'PFA';

export type PerformanceAllowanceMode = 'percentage' | 'fixed';

export type PerformanceAllowanceFilters = {
  staffId?: string;
  departmentId?: string;
  designationId?: string;
  effectiveDate?: string;
};

export type GetPerformanceAllowanceParams = PerformanceAllowanceFilters & {
  mode?: PerformanceAllowanceMode;
  page?: number;
  limit?: number;
};

export type PerformanceAllowanceRecord = {
  id: string;
  code: string;
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

export type PerformanceAllowancePayload = {
  staffId: string;
  mode: PerformanceAllowanceMode;
  value: number;
  effectiveFrom: Date | string;
  effectiveTo: Date | string;
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

/** Loans & Advances — separate collection (M7). */
export const LOAN_ADVANCE_CODE_PREFIX = 'LAN';

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

export type GetLoanAdvanceParams = LoanAdvanceFilters & {
  page?: number;
  limit?: number;
};

export type LoanAdvanceRecord = {
  id: string;
  code: string;
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

export type LoanAdvancePayload = {
  componentId: string;
  staffId: string;
  loanNumber: string;
  bankId: string;
  branch: string;
  accountNumber: string;
  startingBalance: number;
  loanAmount: number;
  monthlyInstallment: number;
  fromDate: Date | string;
  toDate: Date | string;
  comments?: string;
  scheduleForPaid?: boolean;
  completed?: boolean;
  completionDate?: Date | string | null;
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

/** Salary Structures — Phase 0 list shell. */
export type SalaryStructureStatus = 'active' | 'inactive' | 'draft';

export type SalaryStructureWorkflowStepStatus =
  | 'completed'
  | 'current'
  | 'pending';

export type SalaryStructureWorkflowStep = {
  id: number;
  label: string;
  href: string;
  /** When false, click shows a toast instead of navigating. */
  ready: boolean;
  status: SalaryStructureWorkflowStepStatus;
};

export type SalaryStructureFilters = {
  search?: string;
  institution?: string;
  departmentId?: string;
  staffCategory?: string;
  designationId?: string;
  structureId?: string;
  status?: string;
  effectiveDate?: string;
};

export type SalaryStructureCalcMethod =
  | 'fixed'
  | 'percent_of_basic'
  | 'tax_table'
  | 'auto'
  | 'basic_div_200'
  | 'basic_div_30';

export type SalaryStructureLine = {
  id: string;
  componentId?: string | null;
  name: string;
  calcMethod: SalaryStructureCalcMethod;
  value: string;
};

export type SalaryStructureRecord = {
  id: string;
  code: string;
  name: string;
  institutionId?: string;
  institution: string;
  departmentId?: string;
  department: string;
  staffCategoryId?: string;
  staffCategory: string;
  designationId?: string;
  designation: string;
  basicSalary: number;
  allowancesTotal: number;
  deductionsTotal: number;
  gross: number;
  staffCovered: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: SalaryStructureStatus;
  earnings: SalaryStructureLine[];
  deductions: SalaryStructureLine[];
  employerContributions: SalaryStructureLine[];
  otherComponents: SalaryStructureLine[];
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SalaryStructurePayload = {
  name: string;
  institutionId?: string;
  departmentId?: string;
  staffCategoryId: string;
  designationId: string;
  basicSalary: number;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date | null;
  status: SalaryStructureStatus;
  earnings: SalaryStructureLine[];
  deductions: SalaryStructureLine[];
  employerContributions: SalaryStructureLine[];
  otherComponents: SalaryStructureLine[];
};

export type GetSalaryStructureParams = SalaryStructureFilters & {
  page?: number;
  limit?: number;
};

export const SALARY_STRUCTURE_CODE_PREFIX = 'SST';

export type SalaryStructureFormValues = {
  code: string;
  name: string;
  institutionId: string;
  staffCategory: string;
  designationId: string;
  departmentId: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  status: SalaryStructureStatus;
  basicSalary: string;
  earnings: SalaryStructureLine[];
  deductions: SalaryStructureLine[];
  employerContributions: SalaryStructureLine[];
  otherComponents: SalaryStructureLine[];
};

export type SalaryStructureSummary = {
  totalStructures: number;
  active: number;
  draft: number;
  staffCovered: number;
};

export const SALARY_STRUCTURE_STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' },
  { id: 'draft', name: 'Draft' }
] as const;

export const SALARY_STRUCTURE_CALC_METHOD_LABELS: Record<
  SalaryStructureCalcMethod,
  string
> = {
  fixed: 'Fixed',
  percent_of_basic: '% of Basic',
  tax_table: 'Tax Table',
  auto: 'Auto',
  basic_div_200: 'Basic/200',
  basic_div_30: 'Basic/30'
};

/** Amount field is display-only for these calculation methods. */
export const SALARY_STRUCTURE_READONLY_CALC_METHODS: SalaryStructureCalcMethod[] =
  ['tax_table', 'auto', 'basic_div_200', 'basic_div_30'];

export const EMPTY_SALARY_STRUCTURE_FORM: SalaryStructureFormValues = {
  code: '',
  name: '',
  institutionId: '',
  staffCategory: '',
  designationId: '',
  departmentId: '__all__',
  effectiveFrom: null,
  effectiveTo: null,
  status: 'active',
  basicSalary: '',
  earnings: [],
  deductions: [],
  employerContributions: [],
  otherComponents: []
};

export const SALARY_STRUCTURE_WORKFLOW_STEPS: SalaryStructureWorkflowStep[] = [
  {
    id: 1,
    label: 'Salary Structures',
    href: '/salary-structures',
    ready: true,
    status: 'pending'
  },
  {
    id: 2,
    label: 'Allowances',
    href: '/allowances',
    ready: true,
    status: 'pending'
  },
  {
    id: 3,
    label: 'Deductions',
    href: '/deductions',
    ready: true,
    status: 'pending'
  },
  {
    id: 4,
    label: 'Payroll Processing',
    href: '/salary-processing',
    ready: true,
    status: 'pending'
  },
  {
    id: 5,
    label: 'Payslips',
    href: '/payslips',
    ready: true,
    status: 'pending'
  },
  {
    id: 6,
    label: 'Bank Transfer File',
    href: '/bank-transfer-file',
    ready: true,
    status: 'pending'
  },
  {
    id: 7,
    label: 'Salary History',
    href: '/salary-history',
    ready: true,
    status: 'pending'
  }
];

/** Shared payroll workflow stepper steps (pathname marks current). */
export const PAYROLL_WORKFLOW_STEPS = SALARY_STRUCTURE_WORKFLOW_STEPS;

export const EMPTY_SALARY_STRUCTURE_SUMMARY: SalaryStructureSummary = {
  totalStructures: 0,
  active: 0,
  draft: 0,
  staffCovered: 0
};

/**
 * Allowances — thin payroll UI over PaysheetComponent
 * (`fixed_allowance` | `percentage_allowance`). No separate master collection.
 */
export const ALLOWANCE_COMPONENT_TYPE_IDS = [
  'fixed_allowance',
  'percentage_allowance'
] as const;
export type AllowanceComponentTypeId =
  (typeof ALLOWANCE_COMPONENT_TYPE_IDS)[number];

export const ALLOWANCE_KIND_OPTIONS = [
  { id: 'custom', name: 'Custom' },
  { id: 'system', name: 'System based' }
] as const;

export const ALLOWANCE_TYPE_OPTIONS = [
  { id: 'fixed_allowance', name: 'Fixed allowance' },
  { id: 'percentage_allowance', name: 'Percentage allowance' }
] as const;

export const ALLOWANCE_TYPE_LABELS: Record<AllowanceComponentTypeId, string> = {
  fixed_allowance: 'Fixed allowance',
  percentage_allowance: 'Percentage allowance'
};

export type AllowanceFilters = {
  search?: string;
  typeId?: string;
  kind?: string;
};

export type GetAllowanceParams = AllowanceFilters & {
  page?: number;
  limit?: number;
};

export type AllowanceRecord = {
  id: string;
  code: string;
  name: string;
  kind: 'system' | 'custom' | string;
  typeId: AllowanceComponentTypeId | string;
  orderNo: number;
  percentage: number | null;
  includedForIds: string[];
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type AllowanceFormValues = {
  code: string;
  name: string;
  kind: string;
  typeId: string;
  orderNo: string;
  percentage: string;
  includedForIds: string[];
};

export type AllowancePayload = {
  name: string;
  kind: 'system' | 'custom';
  typeId: AllowanceComponentTypeId | string;
  orderNo: number;
  percentage?: number | null;
  includedForIds: string[];
};

export type AllowanceSummary = {
  totalAllowances: number;
  fixed: number;
  percentage: number;
  custom: number;
};

export const EMPTY_ALLOWANCE_FORM: AllowanceFormValues = {
  code: '',
  name: '',
  kind: 'custom',
  typeId: 'fixed_allowance',
  orderNo: '0',
  percentage: '',
  includedForIds: []
};

export const EMPTY_ALLOWANCE_SUMMARY: AllowanceSummary = {
  totalAllowances: 0,
  fixed: 0,
  percentage: 0,
  custom: 0
};

/** Shared catalog status / calc options — still used by Deductions Phase 0 shell. */
export type PayrollCatalogStatus = 'active' | 'inactive' | 'draft';

export type PayrollCalcMethod =
  | 'fixed_per_month'
  | 'percent_of_basic'
  | 'percent_of_gross'
  | 'percent_of_epf_liable'
  | 'tax_table'
  | 'per_shift'
  | 'per_schedule'
  | 'formula';

export const PAYROLL_CATALOG_STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' },
  { id: 'draft', name: 'Draft' }
] as const;

export const PAYROLL_CALC_METHOD_OPTIONS = [
  { id: 'fixed_per_month', name: 'Fixed per month' },
  { id: 'percent_of_basic', name: '% of Basic' },
  { id: 'percent_of_gross', name: '% of Gross' },
  { id: 'percent_of_epf_liable', name: '% of EPF-liable earnings' },
  { id: 'tax_table', name: 'Tax table' },
  { id: 'per_shift', name: 'Per shift' },
  { id: 'per_schedule', name: 'Per schedule' },
  { id: 'formula', name: 'Formula' }
] as const;

export const PAYROLL_CALC_METHOD_LABELS: Record<PayrollCalcMethod, string> = {
  fixed_per_month: 'Fixed per month',
  percent_of_basic: '% of Basic',
  percent_of_gross: '% of Gross',
  percent_of_epf_liable: '% of EPF-liable earnings',
  tax_table: 'Tax table',
  per_shift: 'Per shift',
  per_schedule: 'Per schedule',
  formula: 'Formula'
};

/**
 * Deductions — thin payroll UI over PaysheetComponent
 * (`fixed_deduction` | `loan` | `advance`). No separate master collection.
 * Loan/advance *assignments* stay on Loans & Advances (M7); this page manages
 * the shared component definitions.
 */
export const DEDUCTION_COMPONENT_TYPE_IDS = [
  'fixed_deduction',
  'loan',
  'advance'
] as const;
export type DeductionComponentTypeId =
  (typeof DEDUCTION_COMPONENT_TYPE_IDS)[number];

export const DEDUCTION_KIND_OPTIONS = [
  { id: 'custom', name: 'Custom' },
  { id: 'system', name: 'System based' }
] as const;

export const DEDUCTION_TYPE_OPTIONS = [
  { id: 'fixed_deduction', name: 'Fixed deduction' },
  { id: 'loan', name: 'Loan' },
  { id: 'advance', name: 'Advance' }
] as const;

export const DEDUCTION_TYPE_LABELS: Record<DeductionComponentTypeId, string> = {
  fixed_deduction: 'Fixed deduction',
  loan: 'Loan',
  advance: 'Advance'
};

export type DeductionFilters = {
  search?: string;
  typeId?: string;
  kind?: string;
};

export type GetDeductionParams = DeductionFilters & {
  page?: number;
  limit?: number;
};

export type DeductionRecord = {
  id: string;
  code: string;
  name: string;
  kind: 'system' | 'custom' | string;
  typeId: DeductionComponentTypeId | string;
  orderNo: number;
  percentage: number | null;
  includedForIds: string[];
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type DeductionFormValues = {
  code: string;
  name: string;
  kind: string;
  typeId: string;
  orderNo: string;
  includedForIds: string[];
};

export type DeductionPayload = {
  name: string;
  kind: 'system' | 'custom';
  typeId: DeductionComponentTypeId | string;
  orderNo: number;
  includedForIds: string[];
};

export type DeductionSummary = {
  totalDeductions: number;
  fixed: number;
  loan: number;
  advance: number;
};

export const EMPTY_DEDUCTION_FORM: DeductionFormValues = {
  code: '',
  name: '',
  kind: 'custom',
  typeId: 'fixed_deduction',
  orderNo: '0',
  includedForIds: []
};

export const EMPTY_DEDUCTION_SUMMARY: DeductionSummary = {
  totalDeductions: 0,
  fixed: 0,
  loan: 0,
  advance: 0
};

/**
 * Payslips — Phase 0 register + view sheet.
 * Payment status is owned by Salary Processing / bank confirmation; Payslips only displays/filters it.
 */
export type PayslipPaymentStatus =
  | 'paid'
  | 'processed'
  | 'pending'
  | 'on_hold';

export type PayslipFilters = {
  salaryMonth?: string;
  salaryYear?: string;
  staffId?: string;
  staffCode?: string;
  departmentId?: string;
  designationId?: string;
  institution?: string;
  paymentStatus?: string;
};

export type PayslipRecord = {
  id: string;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  institution: string;
  bankAccountMasked: string;
  epfNumber: string;
  salaryPeriod: string;
  salaryMonth: string;
  salaryYear: string;
  basicSalary: number;
  totalAllowances: number;
  otherEarnings: number;
  grossSalary: number;
  epfStaff: number;
  paye: number;
  loans: number;
  advances: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  employerEpf: number;
  employerEtf: number;
  paymentStatus: PayslipPaymentStatus;
  generatedAt: string | null;
};

export type PayslipSummary = {
  periodLabel: string | null;
  payslipsGenerated: number;
  grossSalary: number;
  netSalary: number;
  onHold: number;
};

export const PAYSLIP_PAYMENT_STATUS_OPTIONS = [
  { id: 'paid', name: 'Paid' },
  { id: 'processed', name: 'Processed' },
  { id: 'pending', name: 'Pending' },
  { id: 'on_hold', name: 'On Hold' }
] as const;

export const PAYSLIP_PAYMENT_STATUS_LABELS: Record<
  PayslipPaymentStatus,
  string
> = {
  paid: 'Paid',
  processed: 'Processed',
  pending: 'Pending',
  on_hold: 'On Hold'
};

export const EMPTY_PAYSLIP_SUMMARY: PayslipSummary = {
  periodLabel: null,
  payslipsGenerated: 0,
  grossSalary: 0,
  netSalary: 0,
  onHold: 0
};

/**
 * Bank Transfer File — Phase 0 batch register + sheets.
 * Mark Processed confirms bank acceptance and (later) marks payslips Paid.
 */
export type BankTransferBatchStatus = 'pending' | 'generated' | 'processed';

export type BankTransferFilters = {
  salaryMonth?: string;
  salaryYear?: string;
  institution?: string;
  departmentId?: string;
  bankId?: string;
  batchStatus?: string;
  batchId?: string;
};

export type BankTransferHistoryEvent = {
  id: string;
  title: string;
  actor: string;
  at: string | null;
};

export type BankTransferBatchRecord = {
  id: string;
  batchCode: string;
  salaryPeriod: string;
  salaryMonth: string;
  salaryYear: string;
  staffCount: number;
  totalNetSalary: number;
  bankId: string;
  bankName: string;
  accountCount: number;
  generatedAt: string | null;
  generatedBy: string | null;
  status: BankTransferBatchStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  history: BankTransferHistoryEvent[];
};

export type BankTransferSummary = {
  periodLabel: string | null;
  batches: number;
  totalTransfer: number;
  processedStaff: number;
  awaitingFileStaff: number;
};

export const BANK_TRANSFER_BATCH_STATUS_OPTIONS = [
  { id: 'pending', name: 'Pending' },
  { id: 'generated', name: 'Generated' },
  { id: 'processed', name: 'Processed' }
] as const;

export const BANK_TRANSFER_BATCH_STATUS_LABELS: Record<
  BankTransferBatchStatus,
  string
> = {
  pending: 'Pending',
  generated: 'Generated',
  processed: 'Processed'
};

export const EMPTY_BANK_TRANSFER_SUMMARY: BankTransferSummary = {
  periodLabel: null,
  batches: 0,
  totalTransfer: 0,
  processedStaff: 0,
  awaitingFileStaff: 0
};

/**
 * Salary History — Phase 0 register + timeline + detail sheets.
 * Timeline is staff-scoped; empty until a staff filter/focus is set.
 */
export type SalaryHistoryComponentType =
  | 'basic'
  | 'allowance'
  | 'other_earning'
  | 'deduction';

export type SalaryHistoryComponentLine = {
  id: string;
  name: string;
  type: SalaryHistoryComponentType;
  amount: number;
};

export type SalaryHistoryAuditEvent = {
  id: string;
  title: string;
  actor: string;
  at: string | null;
};

export type SalaryHistoryTimelineEvent = {
  id: string;
  title: string;
  detail: string;
  at: string | null;
};

export type SalaryHistoryFilters = {
  search?: string;
  staffId?: string;
  staffCode?: string;
  departmentId?: string;
  designationId?: string;
  institution?: string;
  salaryPeriod?: string;
  componentId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SalaryHistoryRecord = {
  id: string;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  institution: string;
  bankAccountMasked: string;
  epfNumber: string;
  salaryPeriod: string;
  salaryMonth: string;
  salaryYear: string;
  basicSalary: number;
  totalAllowances: number;
  otherEarnings: number;
  grossSalary: number;
  epfStaff: number;
  paye: number;
  loans: number;
  advances: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  employerEpf: number;
  employerEtf: number;
  paymentStatus: PayslipPaymentStatus;
  generatedAt: string | null;
  components: SalaryHistoryComponentLine[];
  history: SalaryHistoryAuditEvent[];
};

export type SalaryHistorySummary = {
  periodLabel: string | null;
  records: number;
  staffCount: number;
  netTotal: number;
  paidCount: number;
};

export type SalaryHistoryTimeline = {
  /** Null when no staff focus — UI shows empty-state guidance. */
  staffLabel: string | null;
  events: SalaryHistoryTimelineEvent[];
  netSixMonthAvg: number | null;
  changeSinceLabel: string | null;
  changePercent: number | null;
};

export const SALARY_HISTORY_COMPONENT_TYPE_LABELS: Record<
  SalaryHistoryComponentType,
  string
> = {
  basic: 'Basic',
  allowance: 'Allowance',
  other_earning: 'Other Earning',
  deduction: 'Deduction'
};

export const EMPTY_SALARY_HISTORY_SUMMARY: SalaryHistorySummary = {
  periodLabel: null,
  records: 0,
  staffCount: 0,
  netTotal: 0,
  paidCount: 0
};

export const EMPTY_SALARY_HISTORY_TIMELINE: SalaryHistoryTimeline = {
  staffLabel: null,
  events: [],
  netSixMonthAvg: null,
  changeSinceLabel: null,
  changePercent: null
};

export const EMPTY_SALARY_GENERATION_CYCLE_VALUES: SalaryGenerationCycleFormValues =
  {
    salaryCycleId: '',
    salaryFromDate: null,
    salaryToDate: null,
    workedFromDate: null,
    workedToDate: null
  };
