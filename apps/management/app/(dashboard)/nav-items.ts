import { BedDouble, ClipboardCheck, DoorOpen, LayoutGrid, Network, UserCircle, type LucideIcon } from 'lucide-react';
import type { ManagementFeatures } from '@/lib/management-access';

/**
 * The app's sections — bottom tabs on phones and iPad portrait, sidebar on wider screens.
 * `visible` hides a tab unless channeling gives the privilege (see navItemsFor).
 */
export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; visible?: (f: ManagementFeatures) => boolean }[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/stays', label: 'Stays', icon: BedDouble, visible: (f) => f.roomStays.view },
  { href: '/account', label: 'Account', icon: UserCircle }
];

/** Extra sections in the ☰ menu (phones) and the sidebar "More" group, shown only with the privilege. */
export const MORE_ITEMS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  visible: (f: ManagementFeatures) => boolean;
}[] = [
  {
    href: '/rooms',
    label: 'Rooms',
    description: 'What is in each room',
    icon: DoorOpen,
    visible: (f) => f.roomInventory.view
  },
  {
    href: '/systems',
    label: 'Systems',
    description: 'The systems Management reads from',
    icon: Network,
    visible: () => true
  }
];

/** Tabs this user may see. */
export function navItemsFor(features: ManagementFeatures) {
  return NAV_ITEMS.filter((i) => !i.visible || i.visible(features));
}

export function isNavActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(href + '/');
}
