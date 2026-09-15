'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  RoomLocationSummary,
  RoomUiRecord,
  RoomZoneSummary
} from '@/types/room';
import { RoomUiProvider } from './room-ui-context';
import SectionRoomDetail from './section-room-detail';
import SectionRoomList from './section-room-list';

type Props = {
  initialRecords: RoomUiRecord[];
  locationOptions: RoomLocationSummary[];
  zoneOptions: RoomZoneSummary[];
  initialSelectedId?: string | null;
};

export default function RoomWorkspace({
  initialRecords,
  locationOptions,
  zoneOptions,
  initialSelectedId
}: Props) {
  return (
    <RoomUiProvider
      initialRecords={initialRecords}
      locationOptions={locationOptions}
      zoneOptions={zoneOptions}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Room Management"
          description="Maintain rooms under linked locations and zones. Room numbers sync to Channeling; codes (RM-*) are auto-generated in HRM. Use Refresh to import from Channeling."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionRoomList />
          <SectionRoomDetail />
        </div>
      </div>
    </RoomUiProvider>
  );
}
