import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { listChecklistScopeOptions } from '@/services/room-checklist.service';
import { FormBuilder } from '../form-builder';

export const dynamic = 'force-dynamic';

export default async function NewChecklistFormPage({
  searchParams,
}: {
  searchParams?: Promise<{ kind?: string }>;
}) {
  const session = await fetchServerSession();
  if (!session?.user?.id || !(await checkPermission('room-checklist-forms', 'edit'))) {
    redirect('/unauthorized-access');
  }
  const kind = (await searchParams)?.kind === 'check_out' ? 'check_out' : 'check_in';
  const scope = await listChecklistScopeOptions();
  return <FormBuilder template={null} kind={kind} scope={scope} />;
}
