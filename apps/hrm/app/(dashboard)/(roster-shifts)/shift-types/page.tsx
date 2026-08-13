import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { ShiftTypesHeaderActions } from './header-actions';
import ShiftTypesWorkspace from './shift-types-workspace';
import {
  SAMPLE_SHIFT_TYPES,
  SAMPLE_SHIFT_TYPE_SUMMARY
} from './sample-data';

export default async function ShiftTypesPage() {
  const canView = await checkRouteAccess('/shift-types');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shift-types.visited',
      entityType: 'ShiftType',
      importance: 'low'
    });
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shift Types"
        description="Shift master used by Shift Assignment, Duty Roster and Shift Roster. Defines timings, thresholds and allowance eligibility."
        actions={<ShiftTypesHeaderActions />}
      />

      <ShiftTypesWorkspace
        initialRows={SAMPLE_SHIFT_TYPES}
        summary={SAMPLE_SHIFT_TYPE_SUMMARY}
      />
    </div>
  );
}
