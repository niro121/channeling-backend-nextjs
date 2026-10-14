'use client';

import { Suspense } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { LocationUiRecord } from '@/types/location';
import { LocationUiProvider, useLocationUi } from './location-ui-context';
import SectionLocationDetail from './section-location-detail';
import SectionLocationFilters, {
  type LocationListFilters
} from './section-location-filters';
import SectionLocationList from './section-location-list';

type Props = {
  initialRecords: LocationUiRecord[];
  initialSelectedId?: string | null;
  initialFilters?: LocationListFilters;
};

function LocationWorkspaceBody() {
  const { filters } = useLocationUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Location Management"
        description="Maintain branches and collection centres. Location codes are auto-generated. Use Refresh to import or update records from Channeling."
      />

      <SectionLocationFilters initial={filters} />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
        <SectionLocationList />
        <SectionLocationDetail />
      </div>
    </div>
  );
}

function LocationWorkspaceInner({
  initialRecords,
  initialSelectedId,
  initialFilters = {}
}: Props) {
  return (
    <LocationUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
      initialFilters={initialFilters}
    >
      <LocationWorkspaceBody />
    </LocationUiProvider>
  );
}

export default function LocationWorkspace(props: Props) {
  return (
    <Suspense fallback={null}>
      <LocationWorkspaceInner {...props} />
    </Suspense>
  );
}
