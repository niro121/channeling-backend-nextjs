"use client";

import Link from "next/link";
import { Session } from "next-auth";
import { Hospital } from "lucide-react";
import { canAccessRoute } from "@/lib/permissions";
import { userTypes } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { SidebarNavList } from "./sidebar-nav";

export function DesktopSidebar({
  session,
  e2eRunEnabled = false,
  className,
}: {
  session: Session | null;
  e2eRunEnabled?: boolean;
  className?: string;
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
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r border-primary/20 bg-secondary overflow-hidden sm:flex",
        className
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-primary/20 bg-secondary px-3">
        <Link
          href="/welcome"
          className="flex shrink-0 items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity min-w-0"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Hospital className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex flex-col items-start">
            <span className="truncate w-full text-base leading-tight">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'}</span>
            <span className="text-xs font-normal text-muted-foreground leading-tight">Channeling</span>
          </span>
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 px-3 py-4 min-h-0">
        <SidebarNavList hasAccess={hasAccess} isAdmin={isAdmin} e2eRunEnabled={e2eRunEnabled} />
      </nav>
      <div className="shrink-0 border-t border-primary/20 bg-secondary px-3 py-3">
        <p className="text-muted-foreground text-xs">{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</p>
      </div>
    </aside>
  );
}
