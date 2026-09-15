import { CommonManagerHeader } from "@/components/common/common-manager-header";
import TabLayout from "../tab-layout";

export default function StaffAddPage() {
  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Add Staff"
        description="Add a new staff member to the system."
        backwordButton={true}
      />
      <TabLayout />
    </div>
  );
}