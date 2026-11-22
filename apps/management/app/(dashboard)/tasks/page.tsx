import { Suspense } from 'react';
import { getManagementMe } from '@/lib/management-access';
import { TasksBoard } from './tasks-board';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const me = await getManagementMe();
  if (!me.tasks.view) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have access to tasks. Ask an admin to enable &quot;Management App Tasks&quot; for your user group.
      </div>
    );
  }
  if (!process.env.MANAGEMENT_DATABASE_URL) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Tasks are not set up yet. Set MANAGEMENT_DATABASE_URL.
      </div>
    );
  }
  return (
    <Suspense>
      <TasksBoard />
    </Suspense>
  );
}
