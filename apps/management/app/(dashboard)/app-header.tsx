'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@archmage/ui';
import DashboardBreadcrumb from './breadcrumbs';
import { Profile } from './profile';
import { MORE_ITEMS, NAV_ITEMS, isNavActive } from './nav-items';
import { MoreMenu } from './more-menu';
import { HEADER_ACTIONS_ID } from './header-actions';
import { isInnerPath, parentPath, usePageHeaderState } from './page-header-context';

function initialOf(name?: string | null, email?: string | null): string {
  return (name?.trim() || email?.trim() || 'U').charAt(0).toUpperCase();
}

/** Phones/iPad portrait: large page title + avatar (→ Account). Wider screens: breadcrumbs + profile menu. */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const inner = isInnerPath(pathname);
  const page = usePageHeaderState();
  const title =
    [...NAV_ITEMS, ...MORE_ITEMS].find((item) => isNavActive(pathname, item.href))?.label ?? 'Management';

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        {inner ? (
          <>
            <button
              type="button"
              onClick={() => (page?.onBack ? page.onBack() : router.push(parentPath(pathname)))}
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
              aria-label="Back"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="-ml-2 min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">{page?.title ?? title}</h1>
              {page?.subtitle && <p className="truncate text-xs text-muted-foreground">{page.subtitle}</p>}
            </div>
          </>
        ) : (
          <>
            <MoreMenu />
            <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight lg:hidden">{title}</h1>
            <div className="hidden min-w-0 flex-1 lg:block">
              <DashboardBreadcrumb />
            </div>
          </>
        )}
        <div id={HEADER_ACTIONS_ID} className="flex shrink-0 items-center gap-2" />
        {!inner && (
        <Link href="/account" className="shrink-0 lg:hidden" aria-label="Account">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initialOf(session?.user?.name, session?.user?.email)}
            </AvatarFallback>
          </Avatar>
        </Link>
        )}
        <div className="hidden shrink-0 lg:block">
          <Profile />
        </div>
      </div>
    </header>
  );
}
