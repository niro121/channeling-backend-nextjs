"use client"
'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Paths that should not be prefetched (e.g. admin/seed, admin/run-e2e) to avoid unnecessary requests. */
const PREFETCH_DISABLED_PREFIXES = ['/admin/seed', '/admin/run-e2e'];

export function NavLink({
  href,
  label,
  icon
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + '/');
  const prefetch = !PREFETCH_DISABLED_PREFIXES.some((p) => href === p || href.startsWith(p + '/'));

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer',
        {
          'bg-primary/10 text-primary': isActive,
          'text-muted-foreground hover:bg-muted hover:text-foreground': !isActive
        }
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
