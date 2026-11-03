import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';

// Reports require auth; avoid static prerender so permission checks run at request time.
export const dynamic = 'force-dynamic';

export default async function ReportsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');
  return <>{children}</>;
}
