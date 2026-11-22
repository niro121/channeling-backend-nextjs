import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { listChecklistScopeOptions, listChecklistTemplates } from '@/services/room-checklist.service';
import { ChecklistFormsList } from './forms-list';

export const dynamic = 'force-dynamic';

export default async function RoomChecklistsPage() {
  if (!(await checkRouteAccess('/room-checklists'))) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'roomChecklists.visited',
      entityType: 'ChecklistTemplate',
      importance: 'low',
    });
  }

  const [templates, scope] = await Promise.all([listChecklistTemplates(), listChecklistScopeOptions()]);
  return <ChecklistFormsList templates={templates} scope={scope} />;
}
