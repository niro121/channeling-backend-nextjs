'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isNavActive, navItemsFor } from './nav-items';
import { useFeatures } from './features-context';
import { isInnerPath } from './page-header-context';

/** App-style tab bar for phones and iPad portrait, clear of the home indicator. */
export function BottomTabBar() {
  const pathname = usePathname();
  const items = navItemsFor(useFeatures());
  // Inner pages have a back button in the top bar instead; the tabs would only lead away mid-task.
  if (isInnerPath(pathname)) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex h-16 max-w-xl items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-primary/10')}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
