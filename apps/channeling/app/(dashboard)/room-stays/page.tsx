import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { listStays } from '@/services/room-checklist.service';
import { RoomStaysList } from './stays-list';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

function parseDate(v: string | undefined, endOfDay = false): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function RoomStaysPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string; issues?: string; from?: string; to?: string; page?: string }>;
}) {
  if (!(await checkRouteAccess('/room-stays'))) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({ userId: session.user.id, action: 'roomStays.visited', entityType: 'RoomStay', importance: 'low' });
  }

  const p = (await searchParams) ?? {};
  const page = Math.max(1, Number(p.page) || 1);
  const status = ['occupied', 'closed', 'cancelled'].includes(p.status ?? '') ? p.status! : 'all';
  const { rows, total } = await listStays({
    status: status === 'all' ? null : status,
    q: p.q ?? null,
    issuesOnly: p.issues === '1',
    from: parseDate(p.from),
    to: parseDate(p.to, true),
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <RoomStaysList
      rows={rows}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{ status, q: p.q ?? '', issuesOnly: p.issues === '1', from: p.from ?? '', to: p.to ?? '' }}
    />
  );
}
