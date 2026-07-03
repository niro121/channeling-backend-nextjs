'use client';

import Link from 'next/link';
import { Session } from 'next-auth';
import { Button, Sheet, SheetContent, SheetTrigger, NavLink } from '@archmage/ui';
import { PanelLeft, LayoutGrid, Landmark } from 'lucide-react';

export default function MobileNavClient({ session }: { session: Session | null }) {
  return (
    <Sheet>
      <div />
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs w-52 p-0 flex flex-col">
        <div className="flex h-14 shrink-0 items-center border-b border-primary/20 bg-secondary px-3">
          <Link href="/welcome" className="flex shrink-0 items-center gap-2 text-foreground font-semibold min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex flex-col items-start">
              <span className="truncate w-full text-base leading-tight">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'}</span>
              <span className="text-xs font-normal text-muted-foreground leading-tight">DPAY</span>
            </span>
          </Link>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto flex flex-col gap-6 py-4 px-3 min-h-0">
          <div className="space-y-0.5">
            <NavLink href="/welcome" label="Dashboard" icon={<LayoutGrid className="h-5 w-5" />} />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
