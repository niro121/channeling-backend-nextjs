import UserActivityContent from './user-activity-content';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';

export const dynamic = 'force-dynamic';

export default async function UserActivityReportPage() {
  const userOptionsRes = await getReportUserOptionsAction();
  const initialUserOptions =
    userOptionsRes.success && userOptionsRes.data ? userOptionsRes.data : [];

  return <UserActivityContent initialUserOptions={initialUserOptions} />;
}
