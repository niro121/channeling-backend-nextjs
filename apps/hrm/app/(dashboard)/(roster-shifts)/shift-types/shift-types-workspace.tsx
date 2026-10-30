'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { ShiftTypeRecord, ShiftTypeSummary } from '@/types/roster';
import { ShiftTypesHeaderActions } from './header-actions';
import SectionShiftTypeFilters, {
  type ShiftTypeFilterValues
} from './section-shift-type-filters';
import SectionShiftTypeRegister from './section-shift-type-register';
import SectionShiftTypeSummary from './section-shift-type-summary';
import SheetShiftTypeForm from './sheet-shift-type-form';
import SheetShiftTypeHistory from './sheet-shift-type-history';
import {
  ShiftTypesUiProvider,
  useShiftTypesUi
} from './shift-types-ui-context';

type ShiftTypesWorkspaceProps = {
  records: ShiftTypeRecord[];
  totalRecords: number;
  page?: string;
  filters: ShiftTypeFilterValues;
  summary: ShiftTypeSummary;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function ShiftTypesWorkspaceInner({
  records,
  totalRecords,
  page,
  filters,
  summary,
  onExport
}: ShiftTypesWorkspaceProps) {
  const { formSheet, historyRecord, closeFormSheet, closeHistorySheet } =
    useShiftTypesUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shift Types"
        description="Shift master used by Shift Assignment, Duty Roster and Shift Roster. Defines timings, thresholds and allowance eligibility."
        actions={<ShiftTypesHeaderActions />}
      />

      <SectionShiftTypeSummary summary={summary} />

      <SectionShiftTypeFilters initial={filters} />

      <SectionShiftTypeRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetShiftTypeForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <SheetShiftTypeHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />
    </div>
  );
}

export default function ShiftTypesWorkspace(props: ShiftTypesWorkspaceProps) {
  return (
    <ShiftTypesUiProvider>
      <ShiftTypesWorkspaceInner {...props} />
    </ShiftTypesUiProvider>
  );
}
