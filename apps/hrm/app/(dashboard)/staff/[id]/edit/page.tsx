import { notFound } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { getStaffByIdAction } from '@/app/actions/staff-actions/staff.actions';
import TabLayout from '../../tab-layout';

type EditStaffPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditStaffPage({ params }: EditStaffPageProps) {
  const { id } = await params;
  const response = await getStaffByIdAction(id);

  if (response.isError || !response.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Edit Staff"
        description="Update staff member details."
        backwordButton={true}
      />
      <TabLayout staff={response.data} staffId={id} isEditPage />
    </div>
  );
}
