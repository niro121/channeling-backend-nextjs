'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@archmage/ui';
import DashboardBreadcrumb from './breadcrumbs';
import { Profile } from './profile';
import { NAV_ITEMS, isNavActive } from './nav-items';

function initialOf(name?: string | null, email?: string | null): string {
  return (name?.trim() || email?.trim() || 'U').charAt(0).toUpperCase();
}

/** Phones/iPad portrait: large page title + avatar (→ Account). Wider screens: breadcrumbs + profile menu. */
export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const title = NAV_ITEMS.find((item) => isNavActive(pathname, item.href))?.label ?? 'Management';

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight lg:hidden">{title}</h1>
        <div className="hidden min-w-0 flex-1 lg:block">
          <DashboardBreadcrumb />
        </div>
        <Link href="/account" className="shrink-0 lg:hidden" aria-label="Account">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initialOf(session?.user?.name, session?.user?.email)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="hidden shrink-0 lg:block">
          <Profile />
        </div>
      </div>
    </header>
  );
}
