/** HRM Reports — shared types (Department Reports first). */

export type ReportChartPoint = {
  name: string;
  value: number;
};

export type ReportOption = {
  id: string;
  name: string;
};

export type DepartmentReportCategoryId =
  | 'department_staff_summary'
  | 'department_payroll'
  | 'department_attendance';

export const DEPARTMENT_REPORT_CATEGORIES: readonly {
  id: DepartmentReportCategoryId;
  name: string;
}[] = [
  { id: 'department_staff_summary', name: 'Department-wise Staff Summary' },
  { id: 'department_payroll', name: 'Department Payroll Summary' },
  { id: 'department_attendance', name: 'Department Attendance Summary' }
] as const;

export type DepartmentReportStatus = 'active' | 'inactive';

export type DepartmentReportCards = {
  totalDepartments: number;
  totalStaff: number;
  activeDepartments: number;
  averageStaffPerDepartment: number;
  departmentsWithVacancies: number;
  totalDepartmentPayroll: number;
};

export type DepartmentReportRow = {
  id: string;
  code: string;
  name: string;
  institution: string;
  institutionId: number;
  departmentHead: string;
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  vacancies: number;
  presentStaff: number;
  absentStaff: number;
  leaveCount: number;
  totalOtHours: number;
  payrollExpenditure: number;
  status: DepartmentReportStatus;
};

export type DepartmentReportFilterOptions = {
  institutions: ReportOption[];
  departments: ReportOption[];
};

export type GetDepartmentReportParams = {
  page?: string;
  limit?: string;
  fromDate?: string;
  toDate?: string;
  institution?: string;
  departmentId?: string;
  keyword?: string;
  category?: string;
};

export type DepartmentReportResult = {
  fromDate: string;
  toDate: string;
  periodLabel: string;
  cards: DepartmentReportCards;
  staffByDepartment: ReportChartPoint[];
  payrollByDepartment: ReportChartPoint[];
  rows: DepartmentReportRow[];
  totalRecords: number;
  filterOptions: DepartmentReportFilterOptions;
};

export type DepartmentReportExportRow = {
  departmentCode: string;
  departmentName: string;
  institution: string;
  departmentHead: string;
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  vacancies: number;
  presentStaff: number;
  absentStaff: number;
  leaveCount: number;
  totalOtHours: number;
  payrollExpenditure: string;
  status: string;
};

export const EMPTY_DEPARTMENT_REPORT_CARDS: DepartmentReportCards = {
  totalDepartments: 0,
  totalStaff: 0,
  activeDepartments: 0,
  averageStaffPerDepartment: 0,
  departmentsWithVacancies: 0,
  totalDepartmentPayroll: 0
};

export const EMPTY_DEPARTMENT_FILTER_OPTIONS: DepartmentReportFilterOptions = {
  institutions: [],
  departments: []
};
