import Providers from './providers';
import { fetchServerSession } from '@/lib/session';
import { SidebarLayoutClient } from './sidebar-layout-client';
import { AppHeader } from './app-header';
import { PushSync } from '@/components/pwa/notifications';
import { NoAccessScreen } from '@/components/no-access-screen';
import { getManagementMe } from '@/lib/management-access';
import { TaskPermsProvider } from '@/components/tasks/task-perms';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await fetchServerSession();

  if (!session || !session.user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const me = await getManagementMe();
  const access = me.access;
  if (access !== 'allowed') {
    return (
      <Providers session={session}>
        <NoAccessScreen reason={access} email={session?.user?.email} />
      </Providers>
    );
  }

  return (
    <Providers session={session}>
      <TaskPermsProvider value={me.tasks}>
        <PushSync />
        <div className="flex min-h-dvh w-full flex-col bg-background">
          <SidebarLayoutClient>
            <AppHeader />
            {/* Room for the bottom tab bar (and the home indicator) below lg */}
            <main className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6">
              {children}
            </main>
          </SidebarLayoutClient>
        </div>
      </TaskPermsProvider>
    </Providers>
  );
}
