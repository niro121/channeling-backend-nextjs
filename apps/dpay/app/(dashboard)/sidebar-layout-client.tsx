"use client";

import { DesktopSidebar } from "./desktop-sidebar";
import { Session } from "next-auth";

export function SidebarLayoutClient({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar session={session} className="hidden sm:flex" />
      <div className="flex flex-1 flex-col min-h-screen sm:pl-52">
        {children}
      </div>
    </>
  );
}
