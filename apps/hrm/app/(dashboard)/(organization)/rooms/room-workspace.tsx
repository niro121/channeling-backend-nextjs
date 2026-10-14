'use client';

import { Suspense } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  RoomLocationSummary,
  RoomUiRecord,
  RoomZoneSummary
} from '@/types/room';
import { RoomUiProvider, useRoomUi } from './room-ui-context';
import SectionRoomDetail from './section-room-detail';
import SectionRoomFilters, {
  type RoomListFilters
} from './section-room-filters';
import SectionRoomList from './section-room-list';

type Props = {
  initialRecords: RoomUiRecord[];
  locationOptions: RoomLocationSummary[];
  zoneOptions: RoomZoneSummary[];
  initialSelectedId?: string | null;
  initialFilters?: RoomListFilters;
};

function RoomWorkspaceBody() {
  const { filters } = useRoomUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Room Management"
        description="Maintain rooms under linked locations and zones. Room numbers sync to Channeling; codes (RM-*) are auto-generated in HRM. Use Refresh to import from Channeling."
      />

      <SectionRoomFilters initial={filters} />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
        <SectionRoomList />
        <SectionRoomDetail />
      </div>
    </div>
  );
}

function RoomWorkspaceInner({
  initialRecords,
  locationOptions,
  zoneOptions,
  initialSelectedId,
  initialFilters = {}
}: Props) {
  return (
    <RoomUiProvider
      initialRecords={initialRecords}
      locationOptions={locationOptions}
      zoneOptions={zoneOptions}
      initialSelectedId={initialSelectedId}
      initialFilters={initialFilters}
    >
      <RoomWorkspaceBody />
    </RoomUiProvider>
  );
}

export default function RoomWorkspace(props: Props) {
  return (
    <Suspense fallback={null}>
      <RoomWorkspaceInner {...props} />
    </Suspense>
  );
}
