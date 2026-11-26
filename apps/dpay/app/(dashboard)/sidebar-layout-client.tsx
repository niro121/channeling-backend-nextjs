"use client";

import type { Permissions } from "@archmage/shared";
import { DesktopSidebar } from "./desktop-sidebar";

export function SidebarLayoutClient({
  children,
  permissions,
  userType,
}: {
  children: React.ReactNode;
  permissions?: Permissions | null;
  userType?: number | null;
}) {
  return (
    <>
      <DesktopSidebar className="hidden sm:flex" permissions={permissions} userType={userType} />
      <div className="flex flex-1 flex-col min-h-screen sm:pl-52">
        {children}
      </div>
    </>
  );
}
