'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { canUseAi } from '@/lib/ai/constants';
import { AyuIcon } from '@/components/ai/ayu-avatar';
import { isNavActive, navItemsFor } from './nav-items';
import { useFeatures } from './features-context';
import { isInnerPath } from './page-header-context';

type Tab = ReturnType<typeof navItemsFor>[number];

/**
 * Tabs for the bar. With Ayu in the middle, Account leaves the bar (the avatar in the top bar opens
 * it) unless it's needed to keep both sides even.
 */
function tabsFor(items: Tab[], withAyu: boolean): { left: Tab[]; right: Tab[] } {
  if (!withAyu) return { left: items, right: [] };
  const account = items.find((i) => i.href === '/account');
  const rest = items.filter((i) => i.href !== '/account');
  const tabs = rest.length % 2 === 1 && account ? [...rest, account] : rest;
  const half = Math.ceil(tabs.length / 2);
  return { left: tabs.slice(0, half), right: tabs.slice(half) };
}

/** App-style tab bar for phones and iPad portrait, clear of the home indicator. */
export function BottomTabBar() {
  const pathname = usePathname();
  const features = useFeatures();
  const withAyu = canUseAi(features.ai);
  const { left, right } = tabsFor(navItemsFor(features), withAyu);
  // Inner pages have a back button in the top bar instead; the tabs would only lead away mid-task.
  if (isInnerPath(pathname)) return null;

  const tab = ({ href, label, icon: Icon }: Tab) => {
    const active = isNavActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium outline-none transition-colors focus-visible:bg-muted',
          active ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-primary/10')}>
          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
        </span>
        {label}
      </Link>
    );
  };

  const ayuActive = isNavActive(pathname, '/ayu');

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex h-16 max-w-xl items-stretch">
        {left.map(tab)}
        {withAyu && (
          <Link
            href="/ayu"
            aria-current={ayuActive ? 'page' : undefined}
            aria-label="Ask Ayu"
            className="group flex flex-1 flex-col items-center justify-end gap-1 pb-1.5 text-[11px] font-semibold text-primary outline-none"
          >
            <span
              className={cn(
                'flex items-center justify-center overflow-hidden rounded-full bg-white transition-all group-active:scale-95',
                // Raised above the bar, except on Ayu's own page where it would cover the message box
                ayuActive ? 'h-9 w-9 ring-2 ring-primary' : '-mt-6 h-14 w-14 shadow-lg shadow-primary/30 ring-4 ring-background'
              )}
            >
              <AyuIcon className="h-full w-full" />
            </span>
            Ayu
          </Link>
        )}
        {right.map(tab)}
      </div>
    </nav>
  );
}
