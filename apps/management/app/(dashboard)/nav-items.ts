import { ClipboardCheck, LayoutGrid, ListChecks, Network, Sparkles, UserCircle, type LucideIcon } from 'lucide-react';
import type { TaskPermissions } from '@/lib/tasks/constants';
import { canUseAi, type AiPermissions } from '@/lib/ai/constants';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  needsTasks?: boolean;
  needsAi?: boolean;
  /** Sidebar and menu only — the bottom tab bar keeps five tabs (Ayu has its own header button) */
  notInTabBar?: boolean;
};

/** The app's sections — bottom tabs on phones and iPad portrait, sidebar on wider screens, and the menu. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/tasks', label: 'Tasks', icon: ListChecks, needsTasks: true },
  { href: '/ayu', label: 'Ayu', icon: Sparkles, needsAi: true, notInTabBar: true },
  { href: '/systems', label: 'Systems', icon: Network },
  { href: '/account', label: 'Account', icon: UserCircle }
];

export type NavPerms = { tasks: TaskPermissions; ai: AiPermissions };

export function visibleNavItems(perms: NavPerms, where: 'tabs' | 'menu' = 'menu'): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      (!item.needsTasks || perms.tasks.view) &&
      (!item.needsAi || canUseAi(perms.ai)) &&
      !(where === 'tabs' && item.notInTabBar)
  );
}

export function isNavActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(href + '/');
}
