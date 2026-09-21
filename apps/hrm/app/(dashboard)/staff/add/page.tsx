import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { getStaffSpecialityOptionsAction } from '@/app/actions/hr-admin-actions/staff-speciality.actions';
import TabLayout from '../tab-layout';

export default async function StaffAddPage() {
  const optionsRes = await getStaffSpecialityOptionsAction({ activeOnly: true });
  const specialityOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Add Staff"
        description="Add a new staff member to the system."
        backwordButton={true}
      />
      <TabLayout specialityOptions={specialityOptions} />
    </div>
  );
}
