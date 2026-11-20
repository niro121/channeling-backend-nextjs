import { redirect } from 'next/navigation';
import { checkPermission } from '@/lib/server-permissions';
import LeaveGuideWorkspace from './leave-guide-workspace';

export default async function LeaveGuidePage() {
  const allowed =
    (await checkPermission('leave-application', 'view')) ||
    (await checkPermission('leave-management', 'view')) ||
    (await checkPermission('leave-types', 'view')) ||
    (await checkPermission('leave-entitlement', 'view'));

  if (!allowed) {
    redirect('/unauthorized-access');
  }

  return <LeaveGuideWorkspace />;
}
