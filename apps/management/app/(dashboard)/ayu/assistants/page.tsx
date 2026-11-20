import { getManagementMe } from '@/lib/management-access';
import { AssistantsAdmin } from './assistants-admin';

export const dynamic = 'force-dynamic';

export default async function AssistantsPage() {
  const me = await getManagementMe();
  if (!me.ai.manage) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have access to set up assistants.
      </div>
    );
  }
  return <AssistantsAdmin />;
}
