import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { addDays, format, startOfWeek } from 'date-fns';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { loadRosterAction } from '@/app/actions/roster-actions/shift-roster.actions';
import type { LoadRosterResult } from '@/types/roster';
import { ShiftRosterHeaderActions } from './header-actions';
import ShiftRosterWorkspace from './shift-roster-workspace';

type SearchParams = {
  searchParams?: Promise<{
    department?: string;
    unit?: string;
    roster?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
};

function defaultWeek() {
  const now = new Date();
  const ws = startOfWeek(now, { weekStartsOn: 0 });
  return {
    fromDate: format(ws, 'yyyy-MM-dd'),
    toDate: format(addDays(ws, 6), 'yyyy-MM-dd')
  };
}

const EMPTY_RESULT: LoadRosterResult = {
  rows: [],
  totalRecords: 0,
  summary: {
    staffRostered: 0,
    departments: 0,
    shiftsThisWeek: 0,
    totalHours: 0,
    conflicts: 0
  },
  filterOptions: { departments: [], units: [], rosters: [] },
  shiftTypes: [],
  weekLabel: '',
  weekRangeShort: '',
  dayIsos: []
};

export default async function ShiftRosterPage({ searchParams }: SearchParams) {
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

  const params = await searchParams;
  const defaults = defaultWeek();

  const loadParams = {
    department: params?.department,
    unit: params?.unit,
    roster: params?.roster,
    fromDate: params?.fromDate ?? defaults.fromDate,
    toDate: params?.toDate ?? defaults.toDate,
    search: params?.search,
    page: params?.page,
    limit: params?.limit
  };

  const result = await loadRosterAction(loadParams);
  const data = result.isError ? EMPTY_RESULT : (result.data ?? EMPTY_RESULT);

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shift Roster"
        description="Calendar-based roster planning with drag-and-drop allocation, weekly/monthly views, copy, publish and export."
        actions={<ShiftRosterHeaderActions />}
      />

      <ShiftRosterWorkspace data={data} />
    </div>
  );
}
