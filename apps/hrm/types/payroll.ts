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
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
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
  name: string;
  calcMethod: SalaryStructureCalcMethod;
  value: string;
};

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
    ready: false,
    status: 'pending'
  },
  {
    id: 7,
    label: 'Salary History',
    href: '/salary-history',
    ready: false,
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

/** Allowances master — Phase 0 list + sheet shell. */
export type AllowanceStatus = 'active' | 'inactive' | 'draft';

export type AllowanceType =
  | 'fixed_amount'
  | 'percentage'
  | 'performance_based'
  | 'attendance_based'
  | 'other';

export type AllowanceCalcMethod =
  | 'fixed_per_month'
  | 'percent_of_basic'
  | 'percent_of_gross'
  | 'percent_of_epf_liable'
  | 'tax_table'
  | 'per_shift'
  | 'per_schedule'
  | 'formula';

export type AllowanceFilters = {
  search?: string;
  allowanceType?: string;
  staffCategory?: string;
  departmentId?: string;
  designationId?: string;
  status?: string;
  effectiveDate?: string;
};

export type AllowanceRecord = {
  id: string;
  code: string;
  name: string;
  allowanceType: AllowanceType;
  calcMethod: AllowanceCalcMethod;
  amountOrPercent: string;
  staffCategoryId: string;
  staffCategory: string;
  departmentId: string;
  department: string;
  designationId: string;
  designation: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: AllowanceStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type AllowanceFormValues = {
  code: string;
  name: string;
  allowanceType: string;
  calcMethod: string;
  amountOrPercent: string;
  staffCategory: string;
  departmentId: string;
  designationId: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  status: AllowanceStatus;
};

export type AllowanceSummary = {
  totalAllowances: number;
  active: number;
  monthlyValue: number;
  draftInactive: number;
};

export const ALLOWANCE_STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' },
  { id: 'draft', name: 'Draft' }
] as const;

export const ALLOWANCE_TYPE_OPTIONS = [
  { id: 'fixed_amount', name: 'Fixed Amount' },
  { id: 'percentage', name: 'Percentage' },
  { id: 'performance_based', name: 'Performance Based' },
  { id: 'attendance_based', name: 'Attendance Based' },
  { id: 'other', name: 'Other' }
] as const;

export const ALLOWANCE_TYPE_LABELS: Record<AllowanceType, string> = {
  fixed_amount: 'Fixed Amount',
  percentage: 'Percentage',
  performance_based: 'Performance Based',
  attendance_based: 'Attendance Based',
  other: 'Other'
};

export const ALLOWANCE_CALC_METHOD_OPTIONS = [
  { id: 'fixed_per_month', name: 'Fixed per month' },
  { id: 'percent_of_basic', name: '% of Basic' },
  { id: 'percent_of_gross', name: '% of Gross' },
  { id: 'percent_of_epf_liable', name: '% of EPF-liable earnings' },
  { id: 'tax_table', name: 'Tax table' },
  { id: 'per_shift', name: 'Per shift' },
  { id: 'per_schedule', name: 'Per schedule' },
  { id: 'formula', name: 'Formula' }
] as const;

export const ALLOWANCE_CALC_METHOD_LABELS: Record<AllowanceCalcMethod, string> =
  {
    fixed_per_month: 'Fixed per month',
    percent_of_basic: '% of Basic',
    percent_of_gross: '% of Gross',
    percent_of_epf_liable: '% of EPF-liable earnings',
    tax_table: 'Tax table',
    per_shift: 'Per shift',
    per_schedule: 'Per schedule',
    formula: 'Formula'
  };

export const EMPTY_ALLOWANCE_FORM: AllowanceFormValues = {
  code: '',
  name: '',
  allowanceType: 'fixed_amount',
  calcMethod: 'fixed_per_month',
  amountOrPercent: '',
  staffCategory: '__all__',
  departmentId: '__all__',
  designationId: '__all__',
  effectiveFrom: null,
  effectiveTo: null,
  status: 'active'
};

export const EMPTY_ALLOWANCE_SUMMARY: AllowanceSummary = {
  totalAllowances: 0,
  active: 0,
  monthlyValue: 0,
  draftInactive: 0
};

/** Deductions master — Phase 0 list + sheet shell. */
export type DeductionStatus = 'active' | 'inactive' | 'draft';

export type DeductionType =
  | 'epf'
  | 'etf'
  | 'tax'
  | 'loan'
  | 'advance'
  | 'no_pay'
  | 'other';

export type DeductionCalcMethod = AllowanceCalcMethod;

export type DeductionFilters = {
  search?: string;
  deductionType?: string;
  staffCategory?: string;
  departmentId?: string;
  designationId?: string;
  status?: string;
  effectiveDate?: string;
};

export type DeductionRecord = {
  id: string;
  code: string;
  name: string;
  deductionType: DeductionType;
  calcMethod: DeductionCalcMethod;
  amountOrPercent: string;
  staffCategoryId: string;
  staffCategory: string;
  departmentId: string;
  department: string;
  designationId: string;
  designation: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: DeductionStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type DeductionFormValues = {
  code: string;
  name: string;
  deductionType: string;
  calcMethod: string;
  amountOrPercent: string;
  staffCategory: string;
  departmentId: string;
  designationId: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  status: DeductionStatus;
};

export type DeductionSummary = {
  totalDeductions: number;
  active: number;
  monthlyValue: number;
  draftInactive: number;
};

export const DEDUCTION_STATUS_OPTIONS = ALLOWANCE_STATUS_OPTIONS;

export const DEDUCTION_TYPE_OPTIONS = [
  { id: 'epf', name: 'EPF' },
  { id: 'etf', name: 'ETF' },
  { id: 'tax', name: 'Tax' },
  { id: 'loan', name: 'Loan' },
  { id: 'advance', name: 'Advance' },
  { id: 'no_pay', name: 'No-pay' },
  { id: 'other', name: 'Other' }
] as const;

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  epf: 'EPF',
  etf: 'ETF',
  tax: 'Tax',
  loan: 'Loan',
  advance: 'Advance',
  no_pay: 'No-pay',
  other: 'Other'
};

export const DEDUCTION_CALC_METHOD_OPTIONS = ALLOWANCE_CALC_METHOD_OPTIONS;
export const DEDUCTION_CALC_METHOD_LABELS = ALLOWANCE_CALC_METHOD_LABELS;

export const EMPTY_DEDUCTION_FORM: DeductionFormValues = {
  code: '',
  name: '',
  deductionType: 'epf',
  calcMethod: 'fixed_per_month',
  amountOrPercent: '',
  staffCategory: '__all__',
  departmentId: '__all__',
  designationId: '__all__',
  effectiveFrom: null,
  effectiveTo: null,
  status: 'active'
};

export const EMPTY_DEDUCTION_SUMMARY: DeductionSummary = {
  totalDeductions: 0,
  active: 0,
  monthlyValue: 0,
  draftInactive: 0
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
  staffName?: string;
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

export const EMPTY_SALARY_GENERATION_CYCLE_VALUES: SalaryGenerationCycleFormValues =
  {
    salaryCycleId: '',
    salaryFromDate: null,
    salaryToDate: null,
    workedFromDate: null,
    workedToDate: null
  };
