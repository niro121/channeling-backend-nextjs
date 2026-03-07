import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import UserActivityContent from './user-activity-content';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';

export const dynamic = 'force-dynamic';

export default async function UserActivityReportPage() {
  const canView = await checkRouteAccess('/reports/user-activity');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const userOptionsRes = await getReportUserOptionsAction();
  const initialUserOptions = userOptionsRes.success && userOptionsRes.data ? userOptionsRes.data : [];

  return (
    <UserActivityContent
      initialUserOptions={initialUserOptions}
    />
  );
}
