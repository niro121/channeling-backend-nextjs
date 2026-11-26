import type { Permissions } from '@archmage/shared';

export const REPORT_CATEGORIES = ['Financial', 'System'] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export type ReportPrivilege = {
  action: string;
  name: string;
  description: string;
  route: string;
  category: ReportCategory;
  rank: number;
};

/** One privilege per report. Action ids are stored on the user group under `reports`. */
export const DPAY_REPORTS: ReportPrivilege[] = [
  {
    action: 'receipts',
    name: 'Receipt Report',
    description: 'Patient payment receipts with date filters, search, print, and export.',
    route: '/reports/receipts',
    category: 'Financial',
    rank: 1,
  },
  {
    action: 'doctor-payments',
    name: 'Doctor Payment Report',
    description: 'Doctor payment receipts with totals, status, search, print, and export.',
    route: '/reports/doctor-payments',
    category: 'Financial',
    rank: 2,
  },
  {
    action: 'doctor-due',
    name: 'Doctor Due Payment Report',
    description: 'Doctors still owed for unpaid bill line items, with search, print, and export.',
    route: '/reports/doctor-due',
    category: 'Financial',
    rank: 3,
  },
  {
    action: 'patient-due',
    name: 'Patient Due Report',
    description: 'Patients with outstanding balances (pending / partially paid) for collection follow-up.',
    route: '/reports/patient-due',
    category: 'Financial',
    rank: 4,
  },
  {
    action: 'patient-excess',
    name: 'Patient Excess Report',
    description: 'Patients who overpaid their bills, with excess amount for refund follow-up.',
    route: '/reports/patient-excess',
    category: 'Financial',
    rank: 5,
  },
  {
    action: 'admission-list',
    name: 'Admission List Report',
    description:
      'Admitted patients with BHT, bill number, and patient details. Date filters, search, print, and export.',
    route: '/reports/admission-list',
    category: 'Financial',
    rank: 6,
  },
  {
    action: 'user-activity',
    name: 'User Activity Report',
    description: 'View user activity logs with filters for date range, user, and action.',
    route: '/reports/user-activity',
    category: 'System',
    rank: 1,
  },
];

const BY_ACTION = new Map(DPAY_REPORTS.map((report) => [report.action, report]));
const BY_ROUTE = new Map(DPAY_REPORTS.map((report) => [report.route, report]));

function reportPath(route: string): string {
  const path = route.split('?')[0].replace(/\/$/, '');
  return path || '/reports';
}

export function reportPrivilegeForRoute(route: string): ReportPrivilege | null {
  return BY_ROUTE.get(reportPath(route)) ?? null;
}

export function reportPrivilegeForAction(action: string): ReportPrivilege | null {
  return BY_ACTION.get(action) ?? null;
}

/**
 * An explicit true allows the report. An explicit false blocks it.
 * A missing flag follows View reports list, so existing groups keep every report
 * until that report is turned off.
 */
export function canViewReport(
  permissions: Permissions | null | undefined,
  routeOrAction: string
): boolean {
  const privilege = reportPrivilegeForAction(routeOrAction) ?? reportPrivilegeForRoute(routeOrAction);
  if (!privilege) return false;
  const reports = permissions?.reports;
  if (!reports) return false;
  const specific = reports[privilege.action];
  if (specific === true) return true;
  if (specific === false) return false;
  return reports.view === true;
}

export function reportPrivilegeChecked(
  reports: Record<string, boolean> | undefined,
  action: string
): boolean {
  const specific = reports?.[action];
  if (specific === true) return true;
  if (specific === false) return false;
  return reports?.view === true;
}

/** Open the reports page when the group can see the list or at least one report. */
export function canOpenReportsCatalog(permissions: Permissions | null | undefined): boolean {
  const reports = permissions?.reports;
  if (!reports) return false;
  if (reports.view === true) return true;
  return DPAY_REPORTS.some((report) => reports[report.action] === true);
}

export function canAccessReportPath(
  permissions: Permissions | null | undefined,
  route: string
): boolean {
  const path = reportPath(route);
  if (path === '/reports') return canOpenReportsCatalog(permissions);
  if (path === '/reports/financial') {
    return canViewReport(permissions, 'receipts') || canViewReport(permissions, 'doctor-payments');
  }
  if (reportPrivilegeForRoute(path)) return canViewReport(permissions, path);
  return permissions?.reports?.view === true;
}

export function reportPermissionFlags(checked: boolean): Record<string, boolean> {
  return Object.fromEntries([
    ['view', checked],
    ...DPAY_REPORTS.map((report) => [report.action, checked]),
  ]);
}
