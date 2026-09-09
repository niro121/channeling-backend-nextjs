import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import PatientExcessReportContent from './patient-excess-content';

export const dynamic = 'force-dynamic';

export default async function PatientExcessReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  return <PatientExcessReportContent />;
}
