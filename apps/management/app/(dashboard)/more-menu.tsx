'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { MORE_ITEMS, isNavActive } from './nav-items';
import { useFeatures } from './features-context';

/** ☰ button (phones / iPad portrait) opening a drawer with the extra sections the user may use. */
export function MoreMenu() {
  const pathname = usePathname();
  const features = useFeatures();
  const [open, setOpen] = useState(false);
  const items = MORE_ITEMS.filter((i) => i.visible(features));
  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted lg:hidden"
        aria-label="Menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="flex w-72 flex-col gap-0 p-0 pt-safe pb-safe"
          // Don't land focus (and its ring) on the close button when the drawer opens.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-5 pb-2 pt-5 text-left">
            <SheetTitle className="text-lg">Menu</SheetTitle>
            <SheetDescription className="sr-only">Other sections of the app</SheetDescription>
          </SheetHeader>

          <nav className="flex-1 px-3 py-2">
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                        active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted active:bg-muted'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                      <span className="flex-1 truncate">{label}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="border-t px-5 py-3 text-xs text-muted-foreground">
            {process.env.NEXT_PUBLIC_APP_NAME ?? 'Ruhunu Management'} · v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}
