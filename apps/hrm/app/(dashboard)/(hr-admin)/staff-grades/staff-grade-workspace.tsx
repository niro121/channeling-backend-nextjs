'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { StaffGradeUiRecord } from '@/types/staff-grade';
import { StaffGradeUiProvider } from './staff-grade-ui-context';
import SectionStaffGradeDetail from './section-staff-grade-detail';
import SectionStaffGradeList from './section-staff-grade-list';

type Props = {
  initialRecords: StaffGradeUiRecord[];
  initialSelectedId?: string | null;
};

export default function StaffGradeWorkspace({
  initialRecords,
  initialSelectedId
}: Props) {
  return (
    <StaffGradeUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Area / Staff Grade Management"
          description="Configure staff areas and grades used across the roster and payroll modules."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionStaffGradeList />
          <SectionStaffGradeDetail />
        </div>
      </div>
    </StaffGradeUiProvider>
  );
}
