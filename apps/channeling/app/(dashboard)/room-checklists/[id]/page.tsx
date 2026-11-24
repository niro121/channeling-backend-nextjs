import { notFound, redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getChecklistTemplate, listChecklistScopeOptions } from '@/services/room-checklist.service';
import { FormBuilder } from '../form-builder';

export const dynamic = 'force-dynamic';

export default async function EditChecklistFormPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await checkRouteAccess('/room-checklists'))) redirect('/unauthorized-access');
  const { id } = await params;
  const [template, scope] = await Promise.all([getChecklistTemplate(id), listChecklistScopeOptions()]);
  if (!template) notFound();
  return <FormBuilder template={template} kind={template.kind} scope={scope} />;
}
