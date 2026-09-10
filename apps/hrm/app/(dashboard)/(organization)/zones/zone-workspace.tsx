'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { ZoneLocationSummary, ZoneUiRecord } from '@/types/zone';
import { ZoneUiProvider } from './zone-ui-context';
import SectionZoneDetail from './section-zone-detail';
import SectionZoneList from './section-zone-list';

type Props = {
  initialRecords: ZoneUiRecord[];
  locationOptions: ZoneLocationSummary[];
  initialSelectedId?: string | null;
};

export default function ZoneWorkspace({
  initialRecords,
  locationOptions,
  initialSelectedId
}: Props) {
  return (
    <ZoneUiProvider
      initialRecords={initialRecords}
      locationOptions={locationOptions}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Zone Management"
          description="Maintain zones under linked locations. Zone codes are auto-generated. Use Refresh to import or update records from Channeling."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionZoneList />
          <SectionZoneDetail />
        </div>
      </div>
    </ZoneUiProvider>
  );
}
