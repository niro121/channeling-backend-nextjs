import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import DoctorDueReportContent from './doctor-due-content';

export const dynamic = 'force-dynamic';

export default async function DoctorDuePaymentReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  return <DoctorDueReportContent />;
}
