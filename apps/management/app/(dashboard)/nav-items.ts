import { BedDouble, ClipboardCheck, DoorOpen, LayoutGrid, ListChecks, Network, Sparkles, UserCircle, type LucideIcon } from 'lucide-react';
import type { ManagementFeatures } from '@/lib/management-access';
import { canUseAi } from '@/lib/ai/constants';

type NavItem = { href: string; label: string; icon: LucideIcon; visible?: (f: ManagementFeatures) => boolean };

/**
 * Main sections — bottom tabs on phones and iPad portrait (five at most), sidebar on wider screens.
 * `visible` hides one unless channeling gives the privilege.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/stays', label: 'Stays', icon: BedDouble, visible: (f) => f.roomStays.view },
  { href: '/tasks', label: 'Tasks', icon: ListChecks, visible: (f) => f.tasks.view },
  { href: '/account', label: 'Account', icon: UserCircle }
];

/** Other sections, in the ☰ menu (phones) and the sidebar "More" group. */
export const MORE_ITEMS: (NavItem & { visible: (f: ManagementFeatures) => boolean })[] = [
  { href: '/ayu', label: 'Ask Ayu', icon: Sparkles, visible: (f) => canUseAi(f.ai) },
  { href: '/rooms', label: 'Rooms', icon: DoorOpen, visible: (f) => f.roomInventory.view },
  { href: '/systems', label: 'Systems', icon: Network, visible: () => true }
];

/** Main sections this user may see. */
export function navItemsFor(features: ManagementFeatures) {
  return NAV_ITEMS.filter((i) => !i.visible || i.visible(features));
}

export function isNavActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(href + '/');
}
