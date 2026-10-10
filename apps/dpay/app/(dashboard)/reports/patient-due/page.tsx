import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import PatientDueReportContent from './patient-due-content';

export const dynamic = 'force-dynamic';

export default async function PatientDueReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  return <PatientDueReportContent />;
}
