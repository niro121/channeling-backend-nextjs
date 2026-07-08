"use client";

import Link from "next/link";
import { Session } from "next-auth";
import { NavLink } from "@archmage/ui";
import { LayoutGrid, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserCircle } from "lucide-react";
import { canAccessRoute } from "@/lib/permissions";
import { userTypes } from "@archmage/shared";

function SidebarGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function DesktopSidebar({ session, className }: { session: Session | null; className?: string }) {
  const userType = session?.user?.userType;
  const permissions = session?.user?.permissions;

  const hasAccess = (path: string) => {
    if (userType === userTypes.admin) return true;
    if (permissions) return canAccessRoute(permissions, path);
    return false;
  };
  return (
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r border-primary/20 bg-secondary overflow-hidden sm:flex", className)}>
      <div className="flex h-14 shrink-0 items-center border-b border-primary/20 bg-secondary px-3">
        <Link href="/welcome" className="flex shrink-0 items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UsersRound className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex flex-col items-start">
            <span className="truncate w-full text-base leading-tight">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'}</span>
            <span className="text-xs font-normal text-muted-foreground leading-tight">HRM</span>
          </span>
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 px-3 py-4 min-h-0">
        <div className="space-y-0.5">
          <NavLink href="/welcome" label="Dashboard" icon={<LayoutGrid className="h-5 w-5" />} />
        </div>
        <SidebarGroup label="People">
          {hasAccess("/staff") && <NavLink href="/staff" label="Staff" icon={<UserCircle className="h-5 w-5" />} />}
        </SidebarGroup>
      </nav>

      <div className="shrink-0 border-t border-primary/20 bg-secondary px-3 py-3">
        <p className="text-muted-foreground text-xs">{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</p>
      </div>
    </aside>
  );
}
