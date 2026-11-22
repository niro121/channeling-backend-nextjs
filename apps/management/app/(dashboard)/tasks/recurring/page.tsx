import { getManagementMe } from '@/lib/management-access';
import { RecurringContent } from './recurring-content';

export const dynamic = 'force-dynamic';

export default async function RecurringTasksPage() {
  const me = await getManagementMe();
  if (!me.tasks.recurring && !me.tasks.manageAll) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have access to recurring tasks.
      </div>
    );
  }
  return <RecurringContent />;
}
