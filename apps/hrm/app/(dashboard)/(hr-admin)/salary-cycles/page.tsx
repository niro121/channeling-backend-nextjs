import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getSalaryCycleListAction } from '@/app/actions/hr-admin-actions/salary-cycle.actions';
import SalaryCycleWorkspace from './salary-cycle-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
    institutionId?: string;
  }>;
};

export default async function SalaryCyclesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/salary-cycles');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-cycles.visited',
      entityType: 'SalaryCycle',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const institutionIdRaw = Number(params?.institutionId);
  const initialInstitutionId =
    Number.isInteger(institutionIdRaw) &&
    institutionIdRaw >= 0 &&
    institutionIdRaw <= 3
      ? institutionIdRaw
      : 0;

  const listRes = await getSalaryCycleListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const institutionRecords = records.filter(
    (r) => r.institutionId === initialInstitutionId
  );

  const defaultSelected =
    params?.id && institutionRecords.some((r) => r.id === params.id)
      ? params.id
      : (institutionRecords[0]?.id ?? null);

  return (
    <SalaryCycleWorkspace
      initialRecords={records}
      initialInstitutionId={initialInstitutionId}
      initialSelectedId={defaultSelected}
    />
  );
}
