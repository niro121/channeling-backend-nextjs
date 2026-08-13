import { redirect } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { checkPermission } from '@/lib/server-permissions';
import FormShiftType from '../form-shift-type';

export default async function ShiftTypeAddPage() {
  const canAdd = await checkPermission('shift-roster', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Add Shift Type"
        description="Create a shift master used by roster planning and assignments."
        backwordButton
      />
      <FormShiftType mode="add" />
    </div>
  );
}
