'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { ShiftTypesHeaderActions } from './header-actions';
import SectionShiftTypeFilters, {
  type ShiftTypeFilterValues
} from './section-shift-type-filters';
import SectionShiftTypeRegister from './section-shift-type-register';
import SectionShiftTypeSummary from './section-shift-type-summary';
import SheetShiftTypeForm from './sheet-shift-type-form';
import SheetShiftTypeHistory from './sheet-shift-type-history';
import {
  SAMPLE_SHIFT_CATEGORIES,
  SAMPLE_STATUS_OPTIONS,
  SAMPLE_YES_NO_OPTIONS,
  type ShiftTypeSample,
  type ShiftTypeSummarySample
} from './sample-data';
import {
  ShiftTypesUiProvider,
  useShiftTypesUi
} from './shift-types-ui-context';

type ShiftTypesWorkspaceProps = {
  initialRows: ShiftTypeSample[];
  summary: ShiftTypeSummarySample;
};

const EMPTY_FILTERS: ShiftTypeFilterValues = {
  code: '',
  name: '',
  categoryId: '',
  nightShift: '',
  overnight: '',
  status: ''
};

function filterRows(
  rows: ShiftTypeSample[],
  values: ShiftTypeFilterValues
): ShiftTypeSample[] {
  const categoryName = SAMPLE_SHIFT_CATEGORIES.find(
    (c) => c.id === values.categoryId
  )?.name;
  const codeQ = values.code.trim().toLowerCase();
  const nameQ = values.name.trim().toLowerCase();

  return rows.filter((row) => {
    if (codeQ && !row.code.toLowerCase().includes(codeQ)) return false;
    if (nameQ && !row.name.toLowerCase().includes(nameQ)) return false;
    if (categoryName && row.category !== categoryName) return false;
    if (values.nightShift === 'yes' && !row.isNightShift) return false;
    if (values.nightShift === 'no' && row.isNightShift) return false;
    if (values.overnight === 'yes' && !row.isOvernight) return false;
    if (values.overnight === 'no' && row.isOvernight) return false;
    if (values.status && row.status !== values.status) return false;
    return true;
  });
}

function ShiftTypesWorkspaceInner({
  initialRows,
  summary
}: ShiftTypesWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useShiftTypesUi();
  const [draft, setDraft] = useState<ShiftTypeFilterValues>(EMPTY_FILTERS);
  const [applied, setApplied] =
    useState<ShiftTypeFilterValues>(EMPTY_FILTERS);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [initialRows, applied]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shift Types"
        description="Shift master used by Shift Assignment, Duty Roster and Shift Roster. Defines timings, thresholds and allowance eligibility."
        actions={<ShiftTypesHeaderActions />}
      />

      <SectionShiftTypeSummary summary={summary} />

      <SectionShiftTypeFilters
        values={draft}
        categoryOptions={SAMPLE_SHIFT_CATEGORIES}
        yesNoOptions={SAMPLE_YES_NO_OPTIONS}
        statusOptions={SAMPLE_STATUS_OPTIONS}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => {
          setApplied(draft);
          toast({
            title: 'Filters applied',
            description:
              'Sample data filtered locally. Server search comes in Phase 2.'
          });
        }}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          setApplied(EMPTY_FILTERS);
        }}
      />

      <SectionShiftTypeRegister items={rows} />

      {formSheet ? (
        <SheetShiftTypeForm
          open
          mode={formSheet.mode}
          sample={formSheet.record}
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
