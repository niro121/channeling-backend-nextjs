import { redirect } from 'next/navigation';
import { Card, CardContent } from '@archmage/ui';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { LeaveManagementHeaderActions } from './header-actions';
import SectionPendingApprovals from './section-pending-approvals';
import SectionMyLeaveBalances from './section-my-leave-balances';
import SectionLeaveCalendar from './section-leave-calendar';
import SectionGatePassRequests from './section-gate-pass-requests';

const countCards = [
  { label: 'On Leave Today', value: '—' },
  { label: 'Pending Approval', value: '—' },
  { label: 'Approved (Month)', value: '—' },
  { label: 'Rejected (Month)', value: '—' }
];

export default async function LeaveManagementPage() {
  const canView = await checkRouteAccess('/leave-management');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Leave Management"
        description="Applications, approvals, balances and calendar"
        actions={<LeaveManagementHeaderActions />}
      />

      {/* 1. Count cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {countCards.map((item) => (
          <Card
            key={item.label}
            className="rounded-lg border border-border shadow-sm"
          >
            <CardContent className="px-4 py-4">
              <p className="text-base uppercase font-medium text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Pending Approvals (~65%) + My Leave Balances (~35%) */}
      <div className="grid gap-6 lg:grid-cols-6">
        <div className="lg:col-span-4">
          <SectionPendingApprovals />
        </div>

        <div className="lg:col-span-2">
          <SectionMyLeaveBalances />
        </div>
      </div>

      {/* 3. Leave Calendar (~50%) + Gate Pass Requests (~50%) */}
      <div className="grid gap-6 md:grid-cols-2">
        <SectionLeaveCalendar />
        <SectionGatePassRequests />
      </div>
    </div>
  );
}
