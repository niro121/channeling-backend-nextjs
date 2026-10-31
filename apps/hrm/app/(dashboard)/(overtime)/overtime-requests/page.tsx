import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { OvertimeHeaderActions } from './header-actions';
import SectionOtSummary from './section-ot-summary';
import SectionOtRequests from './section-ot-requests';
import { SAMPLE_OT_REQUESTS, SAMPLE_OT_SUMMARY } from './sample-data';

export default async function OvertimeRequestsPage() {
  const canView = await checkRouteAccess('/overtime-requests');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'overtime-requests.visited',
      entityType: 'OvertimeRequest',
      importance: 'low'
    });
  }

  const approvedMonthLabel = `Approved (${format(new Date(), 'MMM')})`;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Overtime"
        description="OT requests, additional duty forms and approvals"
        actions={<OvertimeHeaderActions />}
      />

      <SectionOtSummary
        summary={SAMPLE_OT_SUMMARY}
        approvedMonthLabel={approvedMonthLabel}
      />

      <SectionOtRequests items={SAMPLE_OT_REQUESTS} />
    </div>
  );
}
