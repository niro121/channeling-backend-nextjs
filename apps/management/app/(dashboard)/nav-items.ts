import { ClipboardCheck, LayoutGrid, ListChecks, Network, UserCircle, type LucideIcon } from 'lucide-react';
import type { TaskPermissions } from '@/lib/tasks/constants';

type NavItem = { href: string; label: string; icon: LucideIcon; needsTasks?: boolean };

/** The app's sections — bottom tabs on phones and iPad portrait, sidebar on wider screens, and the menu. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/tasks', label: 'Tasks', icon: ListChecks, needsTasks: true },
  { href: '/systems', label: 'Systems', icon: Network },
  { href: '/account', label: 'Account', icon: UserCircle }
];

export function visibleNavItems(perms: TaskPermissions): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.needsTasks || perms.view);
}

export function isNavActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(href + '/');
}
