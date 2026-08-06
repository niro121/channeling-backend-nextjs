import { notFound, redirect } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { checkPermission } from '@/lib/server-permissions';
import FormLeaveType, { type LeaveTypeFormValues } from '../../form-leave-type';
import { getSampleLeaveTypeById } from '../../sample-data';
import type { LeaveTypeRecord } from '../../columns';

type EditLeaveTypePageProps = {
  params: Promise<{ id: string }>;
};

function toFormValues(record: LeaveTypeRecord): LeaveTypeFormValues {
  return {
    code: record.code,
    name: record.name,
    description: record.description ?? '',
    isPaid: record.isPaid ? 'yes' : 'no',
    requiresApproval: record.requiresApproval ? 'yes' : 'no',
    allowHalfDay: record.allowHalfDay ? 'yes' : 'no',
    carryForwardAllowed: record.carryForwardAllowed ? 'yes' : 'no',
    maxDaysPerYear:
      record.maxDaysPerYear != null ? String(record.maxDaysPerYear) : '',
    maxCarryForwardDays:
      record.maxCarryForwardDays != null
        ? String(record.maxCarryForwardDays)
        : '',
    status: String(record.status)
  };
}

export default async function LeaveTypeEditPage({
  params
}: EditLeaveTypePageProps) {
  const canEdit = await checkPermission('leave-types', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  // TODO: replace with getLeaveTypeByIdAction once backend is wired
  const leaveType = getSampleLeaveTypeById(id);

  if (!leaveType) {
    notFound();
  }

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
        initialValues={toFormValues(leaveType)}
      />
    </div>
  );
}
