'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import SectionShiftTypeFilters, {
  type ShiftTypeFilterValues
} from './section-shift-type-filters';
import SectionShiftTypeRegister from './section-shift-type-register';
import SectionShiftTypeSummary from './section-shift-type-summary';
import {
  SAMPLE_SHIFT_CATEGORIES,
  SAMPLE_STATUS_OPTIONS,
  SAMPLE_YES_NO_OPTIONS,
  type ShiftTypeSample,
  type ShiftTypeSummarySample
} from './sample-data';

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

export default function ShiftTypesWorkspace({
  initialRows,
  summary
}: ShiftTypesWorkspaceProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ShiftTypeFilterValues>(EMPTY_FILTERS);
  const [applied, setApplied] =
    useState<ShiftTypeFilterValues>(EMPTY_FILTERS);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [initialRows, applied]
  );

  return (
    <div className="space-y-6">
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
    </div>
  );
}
