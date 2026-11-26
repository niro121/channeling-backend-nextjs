import type { Permissions } from '@archmage/shared';
import { hasPermission } from '@/lib/permissions';
import { canOpenReportsCatalog } from '@/lib/report-privileges';
import { userTypes } from '@/lib/roles';

export type DpayNavLink = {
  href: string;
  label: string;
  resource?: string;
};

export const FINANCE_LINKS: DpayNavLink[] = [
  { href: '/patient-bills', label: 'Patient Bills', resource: 'patient-bills' },
  { href: '/receipts', label: 'Receipts', resource: 'receipts' },
  { href: '/receipt-manager', label: 'Receipt Manager', resource: 'receipt-manager' },
  { href: '/doctor-payments', label: 'Doctor Payments', resource: 'doctor-payments' },
  { href: '/reports', label: 'Reports', resource: 'reports' },
];

export const ADMIN_LINKS: DpayNavLink[] = [
  { href: '/users', label: 'Users', resource: 'users' },
  { href: '/user-groups', label: 'User groups', resource: 'users' },
];

export function canSeeLink(
  link: DpayNavLink,
  permissions: Permissions | null | undefined,
  userType?: number | null
): boolean {
  if (!link.resource) return true;
  if (userType === userTypes.admin) return true;
  if (link.resource === 'reports') return canOpenReportsCatalog(permissions);
  return hasPermission(permissions, link.resource, 'view');
}
