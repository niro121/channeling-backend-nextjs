'use client';

import Link from 'next/link';
import { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PanelLeft, Hospital } from 'lucide-react';
import { canAccessRoute } from '@/lib/permissions';
import { userTypes } from '@/lib/roles';
import { SidebarNavList } from './sidebar-nav';

export default function MobileNavClient({
  session,
  e2eRunEnabled
}: {
  session: Session | null;
  e2eRunEnabled: boolean;
}) {
  const userType = session?.user?.userType;
  const permissions = session?.user?.permissions;
  const isAdmin = userType === userTypes.admin;

  const hasAccess = (path: string) => {
    if (isAdmin) return true;
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
              <Hospital className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex flex-col items-start">
              <span className="truncate w-full text-base leading-tight">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'}</span>
              <span className="text-xs font-normal text-muted-foreground leading-tight">Channeling</span>
            </span>
          </Link>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto flex flex-col gap-6 py-4 px-3 min-h-0">
          <SidebarNavList hasAccess={hasAccess} e2eRunEnabled={e2eRunEnabled} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
