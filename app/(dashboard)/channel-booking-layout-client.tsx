"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DesktopSidebar } from "./desktop-sidebar";
import { Session } from "next-auth";

const CHANNEL_BOOKING_PATH = "/channel-booking";

export function ChannelBookingLayoutClient({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChannelBooking = pathname?.startsWith(CHANNEL_BOOKING_PATH);
  const [sidebarOpen, setSidebarOpen] = useState(!isChannelBooking);

  // When navigating to/from channel-booking, sync sidebar state
  useEffect(() => {
    if (isChannelBooking) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isChannelBooking]);

  return (
    <>
      {/* Sidebar: on channel-booking, slide off-screen when closed */}
      <DesktopSidebar
        session={session}
        className={cn(
          "hidden sm:flex transition-transform duration-200 ease-out",
          isChannelBooking && !sidebarOpen && "-translate-x-full"
        )}
      />

      {/* Main content: no left padding when sidebar hidden on channel-booking */}
      <div
        className={cn(
          "flex flex-1 flex-col min-h-screen transition-[padding] duration-200",
          isChannelBooking && !sidebarOpen ? "pl-0" : "sm:pl-52"
        )}
      >
        {children}
      </div>

      {/* Toggle button: only on channel-booking (desktop) */}
      {isChannelBooking && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(
            "fixed z-[60] top-1/2 -translate-y-1/2 h-10 w-6 rounded-l-none rounded-r-md shadow-md border-l-0 border-primary/50 hidden sm:flex items-center justify-center",
            "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            sidebarOpen ? "left-52" : "left-0"
          )}
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      )}
    </>
  );
}
