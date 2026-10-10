import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import AdmissionListReportContent from './admission-list-content';

export const dynamic = 'force-dynamic';

export default async function AdmissionListReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  return <AdmissionListReportContent />;
}
