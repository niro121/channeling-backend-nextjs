import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getChangeStaffDetailAction,
  getChangeStaffFormOptionsAction,
  getChangeStaffMembersAction
} from '@/app/actions/hr-admin-actions/change-staff.actions';
import type { ChangeStaffFormOptions } from '@/types/change-staff';
import ChangeStaffWorkspace from './change-staff-workspace';

export default async function ChangeStaffPage() {
  const canView = await checkRouteAccess('/change-staff');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'change-staff.visited',
      entityType: 'ChangeStaff',
      importance: 'low'
    });
  }

  const [membersRes, optionsRes] = await Promise.all([
    getChangeStaffMembersAction(),
    getChangeStaffFormOptionsAction()
  ]);

  const members = membersRes.isError ? [] : (membersRes.data ?? []);
  const formOptions: ChangeStaffFormOptions = optionsRes.isError
    ? { departments: [], designations: [], grades: [] }
    : (optionsRes.data ?? {
        departments: [],
        designations: [],
        grades: []
      });

  const initialStaffId = members[0]?.id ?? '';
  const detailRes =
    initialStaffId === ''
      ? null
      : await getChangeStaffDetailAction(initialStaffId);
  const initialHistory = detailRes?.data?.history ?? [];

  return (
    <ChangeStaffWorkspace
      initialMembers={members}
      initialHistory={initialHistory}
      formOptions={formOptions}
    />
  );
}
