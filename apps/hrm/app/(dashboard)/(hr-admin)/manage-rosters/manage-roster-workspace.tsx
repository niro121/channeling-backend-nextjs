'use client';

import { Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  ManageRosterDepartmentOption,
  ManageRosterUiRecord,
  ManageRosterWorkspaceTab,
  StaffRosterFilterValues
} from '@/types/manage-roster';
import {
  EMPTY_STAFF_ROSTER_FILTERS,
  MANAGE_ROSTER_WORKSPACE_TAB_LABELS
} from '@/types/manage-roster';
import DialogStaffRosterMoveConfirm from './dialog-staff-roster-move-confirm';
import DialogStaffRosterRemoveConfirm from './dialog-staff-roster-remove-confirm';
import {
  ManageRosterUiProvider,
  useManageRosterUi
} from './manage-roster-ui-context';
import SectionManageRosterDetail from './section-manage-roster-detail';
import SectionManageRosterList from './section-manage-roster-list';
import SectionStaffRosterFilters from './section-staff-roster-filters';
import SectionStaffRosterRegister from './section-staff-roster-register';
import SheetStaffRosterAssign from './sheet-staff-roster-assign';

type Props = {
  initialRecords: ManageRosterUiRecord[];
  initialSelectedId?: string | null;
  initialTab?: ManageRosterWorkspaceTab;
  initialStaffFilters?: StaffRosterFilterValues;
  departmentOptions?: ManageRosterDepartmentOption[];
};

function ManageRosterTabs() {
  const {
    activeTab,
    setActiveTab,
    assignSheetMode,
    closeAssignSheet
  } = useManageRosterUi();

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as ManageRosterWorkspaceTab)
        }
        className="space-y-4"
      >
        <TabsList className="w-full justify-start gap-5 bg-secondary">
          <TabsTrigger
            value="rosters"
            className="data-[state=active]:text-primary text-base"
          >
            {MANAGE_ROSTER_WORKSPACE_TAB_LABELS.rosters}
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            className="data-[state=active]:text-primary text-base"
          >
            {MANAGE_ROSTER_WORKSPACE_TAB_LABELS.staff}
          </TabsTrigger>
        </TabsList>

        {activeTab === 'rosters' ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
            <SectionManageRosterList />
            <SectionManageRosterDetail />
          </div>
        ) : (
          <div className="space-y-4">
            <SectionStaffRosterFilters />
            <SectionStaffRosterRegister />
          </div>
        )}
      </Tabs>

      {assignSheetMode ? (
        <SheetStaffRosterAssign
          open
          mode={assignSheetMode}
          onOpenChange={(next) => {
            if (!next) closeAssignSheet();
          }}
        />
      ) : null}

      <DialogStaffRosterMoveConfirm />
      <DialogStaffRosterRemoveConfirm />
    </div>
  );
}

function ManageRosterWorkspaceInner({
  initialRecords,
  initialSelectedId = null,
  initialTab = 'rosters',
  initialStaffFilters = EMPTY_STAFF_ROSTER_FILTERS,
  departmentOptions = []
}: Props) {
  return (
    <ManageRosterUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
      initialTab={initialTab}
      initialStaffFilters={initialStaffFilters}
      departmentOptions={departmentOptions}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Manage Rosters"
          description="Master list of hospital roster groups — one or more per department, mapped to a team/ward. Register staff membership on the Assigned Staff tab."
        />
        <ManageRosterTabs />
      </div>
    </ManageRosterUiProvider>
  );
}

export default function ManageRosterWorkspace(props: Props) {
  return (
    <Suspense fallback={null}>
      <ManageRosterWorkspaceInner {...props} />
    </Suspense>
  );
}
