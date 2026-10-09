import { LayoutGrid, Network, UserCircle, type LucideIcon } from 'lucide-react';

/** The app's sections — bottom tabs on phones and iPad portrait, sidebar on wider screens. */
export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/systems', label: 'Systems', icon: Network },
  { href: '/account', label: 'Account', icon: UserCircle }
];

export function isNavActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(href + '/');
}
