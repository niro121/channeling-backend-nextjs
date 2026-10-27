import { notFound } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { getStaffByIdAction } from '@/app/actions/staff-actions/staff.actions';
import { getStaffSpecialityOptionsAction } from '@/app/actions/hr-admin-actions/staff-speciality.actions';
import { getPublishedZoneOptionsAction } from '@/app/actions/organization-actions/zone.actions';
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

  const selectedIds = response.data.hrDetails?.specialityIds ?? [];
  const [optionsRes, zonesRes] = await Promise.all([
    getStaffSpecialityOptionsAction({
      activeOnly: true,
      includeIds: selectedIds
    }),
    getPublishedZoneOptionsAction(response.data.hrDetails?.zoneCode)
  ]);
  const specialityOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);
  const zoneOptions = zonesRes.isError ? [] : (zonesRes.data ?? []);

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Edit Staff"
        description="Update staff member details."
        backwordButton={true}
      />
      <TabLayout
        staff={response.data}
        staffId={id}
        isEditPage
        specialityOptions={specialityOptions}
        zoneOptions={zoneOptions}
      />
    </div>
  );
}
