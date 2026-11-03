'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  NightShiftFilterOptions,
  NightShiftFormOptions,
  NightShiftRecord,
  NightShiftSummary
} from '@/types/roster';
import { NightShiftsHeaderActions } from './header-actions';
import SectionNightFilters, {
  type NightFilterValues
} from './section-night-filters';
import SectionNightRegister from './section-night-register';
import SectionNightSummary from './section-night-summary';
import SheetNightShiftForm from './sheet-night-shift-form';
import SheetNightShiftHistory from './sheet-night-shift-history';
import {
  NightShiftsUiProvider,
  useNightShiftsUi
} from './night-shifts-ui-context';

type NightShiftsWorkspaceProps = {
  records: NightShiftRecord[];
  totalRecords: number;
  page?: string;
  summary: NightShiftSummary;
  initialFilters: NightFilterValues;
  filterOptions: NightShiftFilterOptions;
  formOptions: NightShiftFormOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function NightShiftsWorkspaceInner({
  records,
  totalRecords,
  page,
  summary,
  initialFilters,
  filterOptions,
  formOptions,
  onExport
}: NightShiftsWorkspaceProps) {
  const { formSheet, historyRecord, closeFormSheet, closeHistorySheet } =
    useNightShiftsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Night Shifts"
        description="Night duty register generated from the Duty Roster. Tracks night hours, allowances and consecutive-night compliance limits."
        actions={<NightShiftsHeaderActions />}
      />

      <SectionNightSummary summary={summary} />

      <SectionNightFilters
        initial={initialFilters}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        shiftTypeOptions={filterOptions.shiftTypes}
        statusOptions={filterOptions.statuses}
        salaryCycleOptions={[]}
      />

      <SectionNightRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetNightShiftForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          formOptions={formOptions}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <SheetNightShiftHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />
    </div>
  );
}

export default function NightShiftsWorkspace(props: NightShiftsWorkspaceProps) {
  return (
    <NightShiftsUiProvider>
      <NightShiftsWorkspaceInner {...props} />
    </NightShiftsUiProvider>
  );
}
