import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/server-permissions';
import AttendanceGuideWorkspace from './attendance-guide-workspace';

export default async function AttendanceGuidePage() {
  try {
    await requirePermission('attendance', 'view');
  } catch {
    redirect('/unauthorized-access');
  }

  return <AttendanceGuideWorkspace />;
}
