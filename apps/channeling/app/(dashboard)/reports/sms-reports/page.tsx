import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SmsReportsContent from './sms-reports-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function SmsReportsPage() {
  const canView = await checkRouteAccess('/reports/sms-reports');
  if (!canView) redirect('/unauthorized-access');

  const session = await getServerSession(authOptions);
  const currentUserName = session?.user?.name ?? 'System User';

  const locationsResult = await getReportFilterOptions({
    locations: true,
    allLabels: { locations: 'Branch' },
  });

  const locationOptions: Array<{ id: string; name: string }> =
    locationsResult.success && locationsResult.locationOptions
      ? [...locationsResult.locationOptions]
      : [{ id: '__all__', name: 'Branch' }];

  return <SmsReportsContent currentUserName={currentUserName} locationOptions={locationOptions} />;
}
