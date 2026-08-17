'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatDateTime } from '@/lib/utils/date';
import { NightShiftsHeaderActions } from './header-actions';
import SectionNightFilters, {
  type NightFilterValues
} from './section-night-filters';
import SectionNightRegister from './section-night-register';
import SectionNightSummary from './section-night-summary';
import SheetNightShiftForm from './sheet-night-shift-form';
import SheetNightShiftHistory from './sheet-night-shift-history';
import {
  SAMPLE_NIGHT_AUDIT,
  SAMPLE_NIGHT_DEPARTMENTS,
  SAMPLE_NIGHT_SHIFT_TYPES,
  SAMPLE_NIGHT_STATUS,
  SAMPLE_NIGHT_UNITS,
  SAMPLE_SALARY_CYCLES,
  type NightShiftSample,
  type NightShiftSummarySample
} from './sample-data';
import {
  NightShiftsUiProvider,
  useNightShiftsUi
} from './night-shifts-ui-context';

type NightShiftsWorkspaceProps = {
  initialRows: NightShiftSample[];
  summary: NightShiftSummarySample;
};

const EMPTY_FILTERS: NightFilterValues = {
  fromDate: null,
  toDate: null,
  departmentId: '',
  unitId: '',
  shiftTypeId: '',
  staffSearch: '',
  statusId: '',
  salaryCycleId: ''
};

function toDayStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function filterRows(
  rows: NightShiftSample[],
  values: NightFilterValues
): NightShiftSample[] {
  const staffQ = values.staffSearch.trim().toLowerCase();
  const from = values.fromDate ? toDayStart(values.fromDate) : null;
  const to = values.toDate ? toDayStart(values.toDate) : null;

  return rows.filter((row) => {
    if (values.departmentId) {
      const dept = SAMPLE_NIGHT_DEPARTMENTS.find(
        (d) => d.id === values.departmentId
      )?.name;
      if (dept && row.department !== dept) return false;
    }
    if (values.unitId) {
      const unit = SAMPLE_NIGHT_UNITS.find((u) => u.id === values.unitId)?.name;
      if (unit && row.unit !== unit) return false;
    }
    if (values.shiftTypeId && row.shiftTypeId !== values.shiftTypeId) {
      return false;
    }
    if (values.salaryCycleId && row.salaryCycleId !== values.salaryCycleId) {
      return false;
    }
    if (staffQ) {
      const hay = `${row.staffCode} ${row.staffName}`.toLowerCase();
      if (!hay.includes(staffQ)) return false;
    }
    if (from || to) {
      const shiftDay = toDayStart(new Date(`${row.shiftDate}T00:00:00`));
      if (from && shiftDay < from) return false;
      if (to && shiftDay > to) return false;
    }
    return true;
  });
}

function NightShiftsWorkspaceInner({
  initialRows,
  summary
}: NightShiftsWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useNightShiftsUi();
  const [draft, setDraft] = useState<NightFilterValues>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<NightFilterValues>(EMPTY_FILTERS);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [applied, initialRows]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Night Shifts"
        description="Night duty register generated from the Duty Roster. Tracks night hours, allowances and consecutive-night compliance limits."
        actions={<NightShiftsHeaderActions />}
      />

      <SectionNightSummary summary={summary} />

      <SectionNightFilters
        values={draft}
        departmentOptions={SAMPLE_NIGHT_DEPARTMENTS}
        unitOptions={SAMPLE_NIGHT_UNITS}
        shiftTypeOptions={SAMPLE_NIGHT_SHIFT_TYPES}
        statusOptions={SAMPLE_NIGHT_STATUS}
        salaryCycleOptions={SAMPLE_SALARY_CYCLES}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => {
          setApplied(draft);
          toast({
            title: 'Filters applied',
            description:
              'Sample data filtered locally. Server search comes in a later phase.'
          });
        }}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          setApplied(EMPTY_FILTERS);
        }}
      />

      <SectionNightRegister items={rows} />

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          Created by: {SAMPLE_NIGHT_AUDIT.createdBy} ·{' '}
          {formatDateTime(SAMPLE_NIGHT_AUDIT.createdAt)}
        </p>
        <p>
          Last updated: {SAMPLE_NIGHT_AUDIT.updatedBy} ·{' '}
          {formatDateTime(SAMPLE_NIGHT_AUDIT.updatedAt)}
        </p>
      </div>

      {formSheet ? (
        <SheetNightShiftForm
          open
          mode={formSheet.mode}
          sample={formSheet.record}
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
