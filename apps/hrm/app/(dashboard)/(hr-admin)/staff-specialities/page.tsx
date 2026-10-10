import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getStaffSpecialityListAction } from '@/app/actions/hr-admin-actions/staff-speciality.actions';
import StaffSpecialityWorkspace from './staff-speciality-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function StaffSpecialitiesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/staff-specialities');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'staff-specialities.visited',
      entityType: 'StaffSpeciality',
      importance: 'low'
    });
  }

  const listRes = await getStaffSpecialityListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const params = await searchParams;
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <StaffSpecialityWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
    />
  );
}
