import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getPaysheetComponentListAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import {
  PAYSHEET_COMPONENT_INCLUDED_FOR,
  PAYSHEET_COMPONENT_TYPES,
  type PaysheetComponentKind
} from '@/types/paysheet-component';
import PaysheetComponentWorkspace from './paysheet-component-workspace';
import type { PaysheetComponentListFilters } from './section-paysheet-component-filters';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
    kind?: string;
    search?: string;
    typeId?: string;
    includedFor?: string;
  }>;
};

function parseIncludedFor(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const allowed = new Set<string>(PAYSHEET_COMPONENT_INCLUDED_FOR);
  const ids = raw
    .split(',')
    .map((v) => v.trim())
    .filter((id) => allowed.has(id));
  return ids.length ? ids.join(',') : undefined;
}

export default async function PaysheetComponentsPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/paysheet-components');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'paysheet-components.visited',
      entityType: 'PaysheetComponent',
      importance: 'low'
    });
  }

  const listRes = await getPaysheetComponentListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const params = await searchParams;
  const initialKind: PaysheetComponentKind =
    params?.kind === 'custom' ? 'custom' : 'system';

  const typeId =
    params?.typeId &&
    (PAYSHEET_COMPONENT_TYPES as readonly string[]).includes(params.typeId)
      ? params.typeId
      : undefined;

  const initialFilters: PaysheetComponentListFilters = {
    search: params?.search?.trim() || undefined,
    typeId,
    includedFor: parseIncludedFor(params?.includedFor)
  };

  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records.find((r) => r.kind === initialKind)?.id ?? null);

  return (
    <PaysheetComponentWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
      initialKind={initialKind}
      initialFilters={initialFilters}
    />
  );
}
