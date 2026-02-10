'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
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

