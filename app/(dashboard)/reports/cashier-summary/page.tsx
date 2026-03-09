import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import CashierSummaryContent from './cashier-summary-content';

export const dynamic = 'force-dynamic';

export default async function CashierSummaryReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const userOptionsRes = await getReportUserOptionsAction();
  const initialUserOptions = userOptionsRes.success && userOptionsRes.data ? userOptionsRes.data : [];

  return (
    <CashierSummaryContent initialUserOptions={initialUserOptions} />
  );
}
