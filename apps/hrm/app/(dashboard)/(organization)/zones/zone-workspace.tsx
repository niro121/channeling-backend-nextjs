'use client';

import { Suspense } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { ZoneLocationSummary, ZoneUiRecord } from '@/types/zone';
import { ZoneUiProvider, useZoneUi } from './zone-ui-context';
import SectionZoneDetail from './section-zone-detail';
import SectionZoneFilters, {
  type ZoneListFilters
} from './section-zone-filters';
import SectionZoneList from './section-zone-list';

type Props = {
  initialRecords: ZoneUiRecord[];
  locationOptions: ZoneLocationSummary[];
  initialSelectedId?: string | null;
  initialFilters?: ZoneListFilters;
};

function ZoneWorkspaceBody() {
  const { filters } = useZoneUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Zone Management"
        description="Maintain zones under linked locations. Zone codes are auto-generated. Use Refresh to import or update records from Channeling."
      />

      <SectionZoneFilters initial={filters} />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
        <SectionZoneList />
        <SectionZoneDetail />
      </div>
    </div>
  );
}

function ZoneWorkspaceInner({
  initialRecords,
  locationOptions,
  initialSelectedId,
  initialFilters = {}
}: Props) {
  return (
    <ZoneUiProvider
      initialRecords={initialRecords}
      locationOptions={locationOptions}
      initialSelectedId={initialSelectedId}
      initialFilters={initialFilters}
    >
      <ZoneWorkspaceBody />
    </ZoneUiProvider>
  );
}

export default function ZoneWorkspace(props: Props) {
  return (
    <Suspense fallback={null}>
      <ZoneWorkspaceInner {...props} />
    </Suspense>
  );
}
