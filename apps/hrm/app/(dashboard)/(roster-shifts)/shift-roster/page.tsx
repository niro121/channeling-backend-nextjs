import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { ShiftRosterHeaderActions } from './header-actions';
import ShiftRosterWorkspace from './shift-roster-workspace';
import {
  SAMPLE_ROSTER_SUMMARY,
  buildCurrentWeekMeta,
  buildSampleRosterRows
} from './sample-data';

export default async function ShiftRosterPage() {
  const canView = await checkRouteAccess('/shift-roster');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shift-roster.visited',
      entityType: 'ShiftRoster',
      importance: 'low'
    });
  }

  const week = buildCurrentWeekMeta();
  const rows = buildSampleRosterRows(week.dayIsos);

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shift Roster"
        description="Calendar-based roster planning with drag-and-drop allocation, weekly/monthly views, copy, publish and export."
        actions={<ShiftRosterHeaderActions />}
      />

      <ShiftRosterWorkspace
        week={week}
        initialRows={rows}
        summary={SAMPLE_ROSTER_SUMMARY}
      />
    </div>
  );
}
