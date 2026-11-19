import { redirect } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { fetchServerSession } from '@/lib/session';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkPermission } from '@/lib/server-permissions';
import { getLieuLeaveTypeAction } from '@/app/actions/leave-actions/leave-type.actions';
import FormLeaveType from '../form-leave-type';

export default async function LeaveTypeAddLieuPage() {
  const canAdd = await checkPermission('leave-types', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  const existing = await getLieuLeaveTypeAction();
  if (!existing.isError && existing.data?.id) {
    redirect(`/leave-types/${existing.data.id}/edit`);
  }

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'leave-types.visited',
      entityType: 'LeaveType',
      importance: 'low'
    });
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Add Lieu Leave Type"
        description="Create the single compensatory leave bank used by Public Holiday Grant Lieu Leave."
        backwordButton
      />
      <FormLeaveType mode="add" variant="lieu" />
    </div>
  );
}
