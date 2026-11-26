"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { NavLink } from "@archmage/ui";
import { LayoutGrid, Landmark, FileText, Receipt, ScrollText, Wallet, BarChart3, Users, Shield } from "lucide-react";
import type { Permissions } from "@archmage/shared";
import { cn } from "@/lib/utils";
import { ADMIN_LINKS, FINANCE_LINKS, canSeeLink, type DpayNavLink } from "@/lib/dpay-nav";

const ICONS: Record<string, ReactNode> = {
  "/patient-bills": <FileText className="h-5 w-5" />,
  "/receipts": <Receipt className="h-5 w-5" />,
  "/receipt-manager": <ScrollText className="h-5 w-5" />,
  "/doctor-payments": <Wallet className="h-5 w-5" />,
  "/reports": <BarChart3 className="h-5 w-5" />,
  "/users": <Users className="h-5 w-5" />,
  "/user-groups": <Shield className="h-5 w-5" />,
};

function linksFor(
  links: DpayNavLink[],
  permissions: Permissions | null | undefined,
  userType?: number | null
) {
  return links.filter((link) => canSeeLink(link, permissions, userType));
}

export function DesktopSidebar({
  className,
  permissions,
  userType,
}: {
  className?: string;
  permissions?: Permissions | null;
  userType?: number | null;
}) {
  const finance = linksFor(FINANCE_LINKS, permissions, userType);
  const admin = linksFor(ADMIN_LINKS, permissions, userType);

  return (
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r border-primary/20 bg-secondary overflow-hidden sm:flex", className)}>
      <div className="flex h-14 shrink-0 items-center border-b border-primary/20 bg-secondary px-3">
        <Link href="/welcome" className="flex shrink-0 items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Landmark className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex flex-col items-start">
            <span className="truncate w-full text-base leading-tight">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'}</span>
            <span className="text-xs font-normal text-muted-foreground leading-tight">DPAY</span>
          </span>
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 px-3 py-4 min-h-0">
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

      <div className="shrink-0 border-t border-primary/20 bg-secondary px-3 py-3">
        <p className="text-muted-foreground text-xs">{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</p>
      </div>
    </aside>
  );
}
