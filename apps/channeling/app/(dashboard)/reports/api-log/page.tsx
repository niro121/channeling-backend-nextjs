import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ApiLogReportContent from './api-log-report-content';

export const dynamic = 'force-dynamic';

export default async function ApiLogReportPage() {
  const canView = await checkRouteAccess('/reports/api-log');
  if (!canView) redirect('/unauthorized-access');

  return (
    <ApiLogReportContent />
  );
}
