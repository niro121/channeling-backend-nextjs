'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
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
        aria-label="More sections"
      >
        <Menu className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 pt-safe">
          <SheetHeader className="text-left">
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Other sections of the app</SheetDescription>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1">
            {items.map(({ href, label, description, icon: Icon }) => {
              const active = isNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
                    active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{description}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
