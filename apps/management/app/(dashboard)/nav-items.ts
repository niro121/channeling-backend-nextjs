import { ClipboardCheck, DoorOpen, LayoutGrid, Network, UserCircle, type LucideIcon } from 'lucide-react';
import type { ManagementFeatures } from '@/lib/management-access';

/** The app's sections — bottom tabs on phones and iPad portrait, sidebar on wider screens. */
export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/systems', label: 'Systems', icon: Network },
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
  }
];

export function isNavActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(href + '/');
}
