'use client';

import { DesktopSidebar } from './desktop-sidebar';
import { BottomTabBar } from './bottom-tab-bar';

/** Sidebar from 1024px (desktop, iPad landscape); bottom tabs below that (phones, iPad portrait). */
export function SidebarLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar className="hidden lg:flex" />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:pl-52">{children}</div>
      <BottomTabBar />
    </>
  );
}
