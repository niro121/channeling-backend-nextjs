'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  OvernightShiftFilterOptions,
  OvernightShiftFormOptions,
  OvernightShiftRecord,
  OvernightShiftSummary
} from '@/types/roster';
import { OvernightShiftsHeaderActions } from './header-actions';
import SectionOvernightFilters, {
  type OvernightFilterValues
} from './section-overnight-filters';
import SectionOvernightRegister from './section-overnight-register';
import SectionOvernightSummary from './section-overnight-summary';
import SheetOvernightForm from './sheet-overnight-form';
import SheetOvernightHistory from './sheet-overnight-history';
import {
  OvernightShiftsUiProvider,
  useOvernightShiftsUi
} from './overnight-shifts-ui-context';

type OvernightShiftsWorkspaceProps = {
  records: OvernightShiftRecord[];
  totalRecords: number;
  page?: string;
  summary: OvernightShiftSummary;
  initialFilters: OvernightFilterValues;
  filterOptions: OvernightShiftFilterOptions;
  formOptions: OvernightShiftFormOptions;
  onExport: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>[];
    message?: string;
  }>;
};

function OvernightShiftsWorkspaceInner({
  records,
  totalRecords,
  page,
  summary,
  initialFilters,
  filterOptions,
  formOptions,
  onExport
}: OvernightShiftsWorkspaceProps) {
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useOvernightShiftsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Overnight Shifts"
        description="Shifts crossing midnight, with day-split hours and attendance date allocation so RFID punches reconcile against the correct roster day."
        actions={<OvernightShiftsHeaderActions />}
      />

      <SectionOvernightSummary summary={summary} />

      <SectionOvernightFilters
        initial={initialFilters}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        shiftTypeOptions={filterOptions.shiftTypes}
        allocationOptions={filterOptions.allocationOptions}
        statusOptions={filterOptions.statuses}
      />

      <SectionOvernightRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetOvernightForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          formOptions={formOptions}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <SheetOvernightHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />
    </div>
  );
}

export default function OvernightShiftsWorkspace(
  props: OvernightShiftsWorkspaceProps
) {
  return (
    <OvernightShiftsUiProvider>
      <OvernightShiftsWorkspaceInner {...props} />
    </OvernightShiftsUiProvider>
  );
}
