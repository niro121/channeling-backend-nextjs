import { redirect, notFound } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { checkPermission } from '@/lib/server-permissions';
import FormShiftType from '../../form-shift-type';
import { getSampleShiftTypeById } from '../../sample-data';

type ShiftTypeEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShiftTypeEditPage({
  params
}: ShiftTypeEditPageProps) {
  const canEdit = await checkPermission('shift-roster', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  const sample = getSampleShiftTypeById(id);
  if (!sample) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Edit Shift Type"
        description={`Update ${sample.code} — ${sample.name}.`}
        backwordButton
      />
      <FormShiftType mode="edit" sample={sample} />
    </div>
  );
}
