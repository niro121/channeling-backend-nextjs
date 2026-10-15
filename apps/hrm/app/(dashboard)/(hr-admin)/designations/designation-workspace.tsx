'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { DesignationUiRecord } from '@/types/designation';
import {
  DesignationUiProvider
} from './designation-ui-context';
import SectionDesignationDetail from './section-designation-detail';
import SectionDesignationList from './section-designation-list';

type Props = {
  initialRecords: DesignationUiRecord[];
  initialSelectedId?: string | null;
};

export default function DesignationWorkspace({
  initialRecords,
  initialSelectedId
}: Props) {
  return (
    <DesignationUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Designation Management"
          description="Maintain the master list of job designations used across the hospital."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionDesignationList />
          <SectionDesignationDetail />
        </div>
      </div>
    </DesignationUiProvider>
  );
}
