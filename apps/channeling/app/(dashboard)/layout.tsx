import Providers from './providers';
import DashboardBreadcrumb from "./breadcrumbs";
import { fetchServerSession } from "@/lib/session";
import { ChannelBookingLayoutClient } from "./channel-booking-layout-client";
import { ChannelBookingShiftBar } from "./channel-booking/shift-bar";
import { GlobalStartShiftDialog } from "./global-start-shift-dialog";
import { SignOutShiftReminder } from "./signout-shift-reminder";
import { NavigationLoadingWrapper } from "./navigation-loading-wrapper";
import { HeaderClientControls } from './header-client-controls';
import {
  getBulkCashierShiftMaxHours,
  getDefaultShiftMaxHours,
} from "@/lib/shift-duration";

const SHIFT_MAX_HOURS = getDefaultShiftMaxHours();
const SHIFT_MAX_HOURS_BULK = getBulkCashierShiftMaxHours();
const E2E_RUN_ENABLED =
  process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await fetchServerSession();

  // If no session, redirect to login (this should be handled by middleware, but adding as safety)
  if (!session || !session.user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  return (
    <Providers session={session}>
      <NavigationLoadingWrapper>
        <SignOutShiftReminder />
        <GlobalStartShiftDialog
          shiftMaxHours={SHIFT_MAX_HOURS}
          bulkCashierShiftMaxHours={SHIFT_MAX_HOURS_BULK}
        />
        <div className="flex min-h-screen w-full flex-col bg-background">
          <ChannelBookingLayoutClient session={session} e2eRunEnabled={E2E_RUN_ENABLED}>
            <header className="sticky top-0 z-40 flex h-14 shrink-0 flex-nowrap items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-4 sm:px-6 print:hidden">
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden sm:gap-4">
                <DashboardBreadcrumb />
                <ChannelBookingShiftBar />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <HeaderClientControls session={session} e2eRunEnabled={E2E_RUN_ENABLED} />
              </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 print:!p-0">
              {children}
            </main>
          </ChannelBookingLayoutClient>
        </div>
      </NavigationLoadingWrapper>
    </Providers>
  );
}
