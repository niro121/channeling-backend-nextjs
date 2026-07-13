'use client';

import Link from 'next/link';
import { Session } from 'next-auth';
import { Button, Sheet, SheetContent, SheetTrigger, NavLink } from '@archmage/ui';
import { PanelLeft, LayoutGrid, Landmark, FileText, Receipt, Wallet } from 'lucide-react';
import { canAccessRoute } from '@/lib/permissions';
import { userTypes } from '@/lib/roles';

export default function MobileNavClient({ session }: { session: Session | null }) {
  const userType = session?.user?.userType;
  const permissions = session?.user?.permissions;

  const hasAccess = (path: string) => {
    if (userType === userTypes.admin) return true;
    if (permissions) return canAccessRoute(permissions, path);
    return false;
  };

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
            <div>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Finance
              </p>
              <div className="space-y-0.5">
                {hasAccess('/patient-bills') && (
                  <NavLink href="/patient-bills" label="Patient Bills" icon={<FileText className="h-5 w-5" />} />
                )}
                {hasAccess('/receipts') && (
                  <NavLink href="/receipts" label="Receipts" icon={<Receipt className="h-5 w-5" />} />
                )}
                {hasAccess('/doctor-payments') && (
                  <NavLink href="/doctor-payments" label="Doctor Payments" icon={<Wallet className="h-5 w-5" />} />
                )}
              </div>
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
