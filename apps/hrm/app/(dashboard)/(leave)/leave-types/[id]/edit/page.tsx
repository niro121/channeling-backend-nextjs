import { notFound, redirect } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { checkPermission } from '@/lib/server-permissions';
import { getLeaveTypeByIdAction } from '@/app/actions/leave-actions/leave-type.actions';
import { leaveTypeRecordToFormValues } from '@/lib/mappers/leave-type-form.mapper';
import FormLeaveType from '../../form-leave-type';
import type { LeaveTypeRecord } from '@/types/leave';

type EditLeaveTypePageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeaveTypeEditPage({
  params
}: EditLeaveTypePageProps) {
  const canEdit = await checkPermission('leave-types', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  const response = await getLeaveTypeByIdAction(id);

  if (response.isError || !response.data) {
    notFound();
  }

  const leaveType = response.data as LeaveTypeRecord;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Edit Leave Type"
        description="Update leave type details for entitlement and application workflows."
        backwordButton
      />
      <FormLeaveType
        mode="edit"
        leaveTypeId={id}
        initialValues={leaveTypeRecordToFormValues(leaveType)}
      />
    </div>
  );
}
