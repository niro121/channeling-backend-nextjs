"use client";

import { useEffect, useState, Children } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import { NavLink } from "@archmage/ui";
import {
  LayoutGrid,
  UsersRound,
  UserCircle,
  CalendarDays,
  CalendarClock,
  Tags,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

/** Collapsible nav section with a toggle and nested links (e.g. Leave). */
function SidebarCollapsible({
  label,
  icon,
  paths,
  children,
  defaultOpen = false,
}: {
  label: string;
  icon: React.ReactNode;
  /** Routes that keep this section open / highlight the parent when active. */
  paths?: string[];
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const pathname = usePathname();
  const visibleChildren = Children.toArray(children).filter(Boolean);
  const isChildActive =
    paths?.some((path) => pathname === path || pathname?.startsWith(path + "/")) ?? false;

  const [open, setOpen] = useState(defaultOpen || isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  if (visibleChildren.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
          isChildActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-expanded={open}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="ml-3 space-y-0.5 border-l border-primary/10 pl-1">
          {visibleChildren}
        </div>
      )}
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
        <SidebarGroup label="Leave Management">
          <SidebarCollapsible
            label="Leave"
            icon={<CalendarDays className="h-5 w-5" />}
            paths={["/leave-entitlement", "/leave-types"]}
          >
            {hasAccess("/leave-entitlement") && (
              <NavLink href="/leave-entitlement" label="Entitlement" icon={<CalendarDays className="h-5 w-5" />} />
            )}
            {hasAccess("/leave-types") && (
              <NavLink href="/leave-types" label="Types" icon={<Tags className="h-5 w-5" />} />
            )}
          </SidebarCollapsible>
        </SidebarGroup>
      </nav>

      <div className="shrink-0 border-t border-primary/20 bg-secondary px-3 py-3">
        <p className="text-muted-foreground text-xs">{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</p>
      </div>
    </aside>
  );
}
