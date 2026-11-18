import { redirect } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { fetchServerSession } from '@/lib/session';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkPermission } from '@/lib/server-permissions';
import FormLeaveType from '../form-leave-type';

export default async function LeaveTypeAddPage() {
  const canAdd = await checkPermission('leave-types', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
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
        title="Add Leave Type"
        description="Create a leave type for entitlement and application workflows."
        backwordButton
      />
      <FormLeaveType mode="add" />
    </div>
  );
}
