'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { DepartmentUiRecord } from '@/types/department';
import { DepartmentUiProvider } from './department-ui-context';
import SectionDepartmentDetail from './section-department-detail';
import SectionDepartmentList from './section-department-list';

type Props = {
  initialRecords: DepartmentUiRecord[];
  initialSelectedId?: string | null;
};

export default function DepartmentWorkspace({
  initialRecords,
  initialSelectedId
}: Props) {
  return (
    <DepartmentUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Department Management"
          description="Maintain departments by institution. Use Refresh to import or update records from Channeling."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionDepartmentList />
          <SectionDepartmentDetail />
        </div>
      </div>
    </DepartmentUiProvider>
  );
}
