'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import { Button } from '@archmage/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DesktopSidebar } from './desktop-sidebar';

/** Wide calendar / focus pages — sidebar starts collapsed (Channeling pattern). */
const SIDEBAR_AUTO_COLLAPSE_PATHS = ['/shift-roster'] as const;

export function SidebarLayoutClient({
  session,
  children
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSidebarAutoCollapsedPage = SIDEBAR_AUTO_COLLAPSE_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`)
  );
  const [sidebarOpen, setSidebarOpen] = useState(!isSidebarAutoCollapsedPage);

  useEffect(() => {
    setSidebarOpen(!isSidebarAutoCollapsedPage);
  }, [isSidebarAutoCollapsedPage]);

  return (
    <>
      <DesktopSidebar
        session={session}
        className={cn(
          'hidden sm:flex transition-transform duration-200 ease-out',
          isSidebarAutoCollapsedPage && !sidebarOpen && '-translate-x-full'
        )}
      />

      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col transition-[padding] duration-200',
          isSidebarAutoCollapsedPage && !sidebarOpen ? 'pl-0' : 'sm:pl-52'
        )}
      >
        {children}
      </div>

      {isSidebarAutoCollapsedPage ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(
            'fixed z-60 top-7 hidden h-10 w-4 -translate-y-1/2 items-center justify-center rounded-l-none rounded-r-md border-l-0 border-primary/50 shadow-md sm:flex',
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
            sidebarOpen ? 'left-52' : 'left-0'
          )}
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ) : null}
    </>
  );
}
