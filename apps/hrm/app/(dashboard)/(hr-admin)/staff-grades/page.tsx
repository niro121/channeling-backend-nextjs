import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getStaffGradeListAction } from '@/app/actions/hr-admin-actions/staff-grade.actions';
import StaffGradeWorkspace from './staff-grade-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function StaffGradesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/staff-grades');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'staff-grades.visited',
      entityType: 'StaffGrade',
      importance: 'low'
    });
  }

  const listRes = await getStaffGradeListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const params = await searchParams;
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <StaffGradeWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
    />
  );
}
