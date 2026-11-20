import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/server-permissions';
import RosterShiftsGuideWorkspace from './roster-shifts-guide-workspace';

export default async function RosterShiftsGuidePage() {
  try {
    await requirePermission('shift-roster', 'view');
  } catch {
    redirect('/unauthorized-access');
  }

  return <RosterShiftsGuideWorkspace />;
}
