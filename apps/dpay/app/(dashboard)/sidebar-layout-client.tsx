"use client";

import { DesktopSidebar } from "./desktop-sidebar";

export function SidebarLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar className="hidden sm:flex" />
      <div className="flex flex-1 flex-col min-h-screen sm:pl-52">
        {children}
      </div>
    </>
  );
}
