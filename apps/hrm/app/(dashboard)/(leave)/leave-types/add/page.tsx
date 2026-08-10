import { redirect } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { checkPermission } from '@/lib/server-permissions';
import FormLeaveType from '../form-leave-type';

export default async function LeaveTypeAddPage() {
  const canAdd = await checkPermission('leave-types', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
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
