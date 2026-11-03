import Providers from './providers';
import { fetchServerSession } from '@/lib/session';
import DashboardBreadcrumb from './breadcrumbs';
import { NavigationLoadingWrapper } from './navigation-loading-wrapper';
import { HeaderClientControls } from './header-client-controls';
import { SidebarLayoutClient } from './sidebar-layout-client';
import { ShiftStrip } from './shift-strip';
import { loadCashierShift } from '@/lib/dpay-shift';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await fetchServerSession();

  if (!session?.user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
    return null;
  }

  const shiftState = await loadCashierShift(session.user.id);

  return (
    <Providers session={session}>
      <NavigationLoadingWrapper>
        <div className="flex min-h-screen w-full flex-col bg-background">
          <SidebarLayoutClient session={session}>
            <header className="sticky top-0 z-40 flex h-14 shrink-0 flex-nowrap items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-4 overflow-hidden">
                <DashboardBreadcrumb />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <ShiftStrip initialShift={shiftState.success ? shiftState.shift : null} />
                <HeaderClientControls session={session} />
              </div>
            </header>
            <main className="flex-1 p-4 sm:p-6">
              {children}
            </main>
          </SidebarLayoutClient>
        </div>
      </NavigationLoadingWrapper>
    </Providers>
  );
}
