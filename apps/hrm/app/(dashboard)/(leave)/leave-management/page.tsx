import { redirect } from 'next/navigation';
import { getMonth, getYear } from 'date-fns';
import { getServerSession } from 'next-auth';
import { Card, CardContent } from '@archmage/ui';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getLeaveCalendarDaysAction,
  getLeaveManagementCountsAction,
  getMyLeaveBalancesAction,
  getPendingLeaveApprovalsAction
} from '@/app/actions/leave-actions/leave-management.actions';
import { LeaveManagementHeaderActions } from './header-actions';
import SectionPendingApprovals from './section-pending-approvals';
import SectionMyLeaveBalances from './section-my-leave-balances';
import SectionLeaveCalendar from './section-leave-calendar';
import SectionGatePassRequests from './section-gate-pass-requests';

export default async function LeaveManagementPage() {
  const canView = await checkRouteAccess('/leave-management');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'leave-management.visited',
      entityType: 'LeaveApplication',
      importance: 'low'
    });
  }

  const now = new Date();
  const month = getMonth(now);
  const year = getYear(now);

  const [countsRes, pendingRes, balancesRes, calendarRes] = await Promise.all([
    getLeaveManagementCountsAction(),
    getPendingLeaveApprovalsAction(),
    getMyLeaveBalancesAction(),
    getLeaveCalendarDaysAction({ month, year })
  ]);

  const counts = countsRes.data ?? {
    onLeaveToday: 0,
    pendingApproval: 0,
    approvedMonth: 0,
    rejectedMonth: 0
  };

  const countCards = [
    { label: 'On Leave Today', value: String(counts.onLeaveToday) },
    { label: 'Pending Approval', value: String(counts.pendingApproval) },
    { label: 'Approved (Month)', value: String(counts.approvedMonth) },
    { label: 'Rejected (Month)', value: String(counts.rejectedMonth) }
  ];

  const pendingItems = pendingRes.isError ? [] : (pendingRes.data ?? []);
  const balanceItems = balancesRes.isError
    ? []
    : (balancesRes.data?.items ?? []);
  const balanceEmptyMessage = !balancesRes.data?.staffId
    ? 'Your login is not linked to a staff profile. Ask HR to set Auth User.staffId.'
    : 'No leave entitlements found for your staff profile.';

  const calendarDays = calendarRes.isError ? {} : (calendarRes.data ?? {});

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Leave Management"
        description="Applications, approvals, balances and calendar"
        actions={<LeaveManagementHeaderActions />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {countCards.map((item) => (
          <Card
            key={item.label}
            className="rounded-lg border border-border shadow-sm"
          >
            <CardContent className="px-4 py-4">
              <p className="text-base font-medium uppercase text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-6">
        <div className="lg:col-span-4">
          <SectionPendingApprovals items={pendingItems} />
        </div>

        <div className="lg:col-span-2">
          <SectionMyLeaveBalances
            items={balanceItems}
            emptyMessage={balanceEmptyMessage}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionLeaveCalendar initialDays={calendarDays} />
        <SectionGatePassRequests />
      </div>
    </div>
  );
}
