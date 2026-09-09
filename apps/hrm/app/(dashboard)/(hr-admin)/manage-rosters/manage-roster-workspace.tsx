'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { ManageRosterUiRecord } from '@/types/manage-roster';
import { ManageRosterUiProvider } from './manage-roster-ui-context';
import SectionManageRosterDetail from './section-manage-roster-detail';
import SectionManageRosterList from './section-manage-roster-list';

type Props = {
  initialRecords: ManageRosterUiRecord[];
  initialSelectedId?: string | null;
};

export default function ManageRosterWorkspace({
  initialRecords,
  initialSelectedId
}: Props) {
  return (
    <ManageRosterUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Manage Rosters"
          description="Master list of hospital rosters — one roster per team/ward, mapped to a department."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionManageRosterList />
          <SectionManageRosterDetail />
        </div>
      </div>
    </ManageRosterUiProvider>
  );
}
