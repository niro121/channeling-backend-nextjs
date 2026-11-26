'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, Sheet, SheetContent, SheetTrigger, NavLink } from '@archmage/ui';
import { PanelLeft, LayoutGrid, Landmark, FileText, Receipt, ScrollText, Wallet, BarChart3, Users, Shield } from 'lucide-react';
import type { Permissions } from '@archmage/shared';
import { ADMIN_LINKS, FINANCE_LINKS, canSeeLink, type DpayNavLink } from '@/lib/dpay-nav';

const ICONS: Record<string, ReactNode> = {
  '/patient-bills': <FileText className="h-5 w-5" />,
  '/receipts': <Receipt className="h-5 w-5" />,
  '/receipt-manager': <ScrollText className="h-5 w-5" />,
  '/doctor-payments': <Wallet className="h-5 w-5" />,
  '/reports': <BarChart3 className="h-5 w-5" />,
  '/users': <Users className="h-5 w-5" />,
  '/user-groups': <Shield className="h-5 w-5" />,
};

function visible(links: DpayNavLink[], permissions?: Permissions | null, userType?: number | null) {
  return links.filter((link) => canSeeLink(link, permissions, userType));
}

export default function MobileNavClient({
  permissions,
  userType,
}: {
  permissions?: Permissions | null;
  userType?: number | null;
}) {
  const finance = visible(FINANCE_LINKS, permissions, userType);
  const admin = visible(ADMIN_LINKS, permissions, userType);

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
          <div className="space-y-3">
            <NavLink href="/welcome" label="Dashboard" icon={<LayoutGrid className="h-5 w-5" />} />
            {finance.length > 0 ? (
              <div>
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Finance
                </p>
                <div className="space-y-0.5">
                  {finance.map((link) => (
                    <NavLink key={link.href} href={link.href} label={link.label} icon={ICONS[link.href]} />
                  ))}
                </div>
              </div>
            ) : null}
            {admin.length > 0 ? (
              <div>
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Administration
                </p>
                <div className="space-y-0.5">
                  {admin.map((link) => (
                    <NavLink key={link.href} href={link.href} label={link.label} icon={ICONS[link.href]} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
