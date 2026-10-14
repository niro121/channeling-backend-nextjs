'use client';

import { Suspense } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { DepartmentUiRecord } from '@/types/department';
import {
  DepartmentUiProvider,
  useDepartmentUi
} from './department-ui-context';
import SectionDepartmentDetail from './section-department-detail';
import SectionDepartmentFilters, {
  type DepartmentListFilters
} from './section-department-filters';
import SectionDepartmentList from './section-department-list';

type Props = {
  initialRecords: DepartmentUiRecord[];
  initialSelectedId?: string | null;
  initialFilters?: DepartmentListFilters;
};

function DepartmentWorkspaceBody() {
  const { filters } = useDepartmentUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Department Management"
        description="Maintain departments by institution. Use Refresh to import or update records from Channeling."
      />

      <SectionDepartmentFilters initial={filters} />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
        <SectionDepartmentList />
        <SectionDepartmentDetail />
      </div>
    </div>
  );
}

function DepartmentWorkspaceInner({
  initialRecords,
  initialSelectedId,
  initialFilters = {}
}: Props) {
  return (
    <DepartmentUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
      initialFilters={initialFilters}
    >
      <DepartmentWorkspaceBody />
    </DepartmentUiProvider>
  );
}

export default function DepartmentWorkspace(props: Props) {
  return (
    <Suspense fallback={null}>
      <DepartmentWorkspaceInner {...props} />
    </Suspense>
  );
}
