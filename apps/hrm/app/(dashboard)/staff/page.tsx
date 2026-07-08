import { CommonManagerHeader } from '@/components/common/common-manager-header';
import TabLayout from './tab-layout';

export default function StaffPage() {
  return (
    <div className="space-y-5">
      <CommonManagerHeader
        title="Edit Staff"
        description="Update personal, HR, employment and document information for this staff member."
        backwordButton={true}
      />
      <TabLayout />
    </div>
  );
}
