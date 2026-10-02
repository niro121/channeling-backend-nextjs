import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/server-permissions';
import PayrollGuideWorkspace from './payroll-guide-workspace';

export default async function PayrollGuidePage() {
  try {
    await requirePermission('payroll', 'view');
  } catch {
    redirect('/unauthorized-access');
  }

  return <PayrollGuideWorkspace />;
}
