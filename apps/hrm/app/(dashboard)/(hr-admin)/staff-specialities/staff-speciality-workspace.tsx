'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { StaffSpecialityUiRecord } from '@/types/staff-speciality';
import { StaffSpecialityUiProvider } from './staff-speciality-ui-context';
import SectionStaffSpecialityDetail from './section-staff-speciality-detail';
import SectionStaffSpecialityList from './section-staff-speciality-list';

type Props = {
  initialRecords: StaffSpecialityUiRecord[];
  initialSelectedId?: string | null;
};

export default function StaffSpecialityWorkspace({
  initialRecords,
  initialSelectedId
}: Props) {
  return (
    <StaffSpecialityUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Staff Specialities"
          description="Maintain clinical, nursing, and admin specialities used when assigning staff."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionStaffSpecialityList />
          <SectionStaffSpecialityDetail />
        </div>
      </div>
    </StaffSpecialityUiProvider>
  );
}
