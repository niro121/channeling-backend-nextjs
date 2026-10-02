'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { LocationUiRecord } from '@/types/location';
import { LocationUiProvider } from './location-ui-context';
import SectionLocationDetail from './section-location-detail';
import SectionLocationList from './section-location-list';

type Props = {
  initialRecords: LocationUiRecord[];
  initialSelectedId?: string | null;
};

export default function LocationWorkspace({
  initialRecords,
  initialSelectedId
}: Props) {
  return (
    <LocationUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Location Management"
          description="Maintain branches and collection centres. Location codes are auto-generated. Use Refresh to import or update records from Channeling."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionLocationList />
          <SectionLocationDetail />
        </div>
      </div>
    </LocationUiProvider>
  );
}
