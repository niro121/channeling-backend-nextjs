import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getHolidayCalendarListAction } from '@/app/actions/hr-admin-actions/holiday-calendar.actions';
import HolidayCalendarWorkspace from './holiday-calendar-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
    year?: string;
  }>;
};

export default async function HolidayCalendarPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/holiday-calendar');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'holiday-calendar.visited',
      entityType: 'HolidayCalendar',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const yearParam = params?.year ? Number.parseInt(params.year, 10) : undefined;
  const initialYear =
    yearParam && !Number.isNaN(yearParam) ? yearParam : new Date().getFullYear();

  const listRes = await getHolidayCalendarListAction({ year: initialYear });
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <HolidayCalendarWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
      initialYear={initialYear}
    />
  );
}
