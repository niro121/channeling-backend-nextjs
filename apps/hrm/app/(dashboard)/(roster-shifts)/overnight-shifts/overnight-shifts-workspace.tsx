'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatDateTime } from '@/lib/utils/date';
import { OvernightShiftsHeaderActions } from './header-actions';
import SectionOvernightFilters, {
  type OvernightFilterValues
} from './section-overnight-filters';
import SectionOvernightRegister from './section-overnight-register';
import SectionOvernightSummary from './section-overnight-summary';
import SheetOvernightForm from './sheet-overnight-form';
import SheetOvernightHistory from './sheet-overnight-history';
import {
  SAMPLE_OVERNIGHT_ALLOCATIONS,
  SAMPLE_OVERNIGHT_AUDIT,
  SAMPLE_OVERNIGHT_DEPARTMENTS,
  SAMPLE_OVERNIGHT_SHIFT_TYPES,
  SAMPLE_OVERNIGHT_STATUS,
  SAMPLE_OVERNIGHT_UNITS,
  type OvernightShiftSample,
  type OvernightSummarySample
} from './sample-data';
import {
  OvernightShiftsUiProvider,
  useOvernightShiftsUi
} from './overnight-shifts-ui-context';

type OvernightShiftsWorkspaceProps = {
  initialRows: OvernightShiftSample[];
  summary: OvernightSummarySample;
};

const EMPTY_FILTERS: OvernightFilterValues = {
  fromDate: null,
  toDate: null,
  departmentId: '',
  unitId: '',
  shiftTypeId: '',
  allocationId: '',
  staffSearch: '',
  statusId: ''
};

function toDayStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function filterRows(
  rows: OvernightShiftSample[],
  values: OvernightFilterValues
): OvernightShiftSample[] {
  const staffQ = values.staffSearch.trim().toLowerCase();
  const from = values.fromDate ? toDayStart(values.fromDate) : null;
  const to = values.toDate ? toDayStart(values.toDate) : null;

  return rows.filter((row) => {
    if (values.departmentId) {
      const dept = SAMPLE_OVERNIGHT_DEPARTMENTS.find(
        (d) => d.id === values.departmentId
      )?.name;
      if (dept && row.department !== dept) return false;
    }
    if (values.unitId) {
      const unit = SAMPLE_OVERNIGHT_UNITS.find(
        (u) => u.id === values.unitId
      )?.name;
      if (unit && row.unit !== unit) return false;
    }
    if (values.shiftTypeId && row.shiftTypeId !== values.shiftTypeId) {
      return false;
    }
    if (values.allocationId && row.allocationId !== values.allocationId) {
      return false;
    }
    if (values.statusId && row.status !== values.statusId) return false;
    if (staffQ) {
      const hay = `${row.staffCode} ${row.staffName}`.toLowerCase();
      if (!hay.includes(staffQ)) return false;
    }
    if (from || to) {
      const startDay = toDayStart(new Date(`${row.shiftStart}T00:00:00`));
      if (from && startDay < from) return false;
      if (to && startDay > to) return false;
    }
    return true;
  });
}

function OvernightShiftsWorkspaceInner({
  initialRows,
  summary
}: OvernightShiftsWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useOvernightShiftsUi();
  const [draft, setDraft] = useState<OvernightFilterValues>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<OvernightFilterValues>(EMPTY_FILTERS);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [applied, initialRows]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Overnight Shifts"
        description="Shifts crossing midnight, with day-split hours and attendance date allocation so RFID punches reconcile against the correct roster day."
        actions={<OvernightShiftsHeaderActions />}
      />

      <SectionOvernightSummary summary={summary} />

      <SectionOvernightFilters
        values={draft}
        departmentOptions={SAMPLE_OVERNIGHT_DEPARTMENTS}
        unitOptions={SAMPLE_OVERNIGHT_UNITS}
        shiftTypeOptions={SAMPLE_OVERNIGHT_SHIFT_TYPES}
        allocationOptions={SAMPLE_OVERNIGHT_ALLOCATIONS}
        statusOptions={SAMPLE_OVERNIGHT_STATUS}
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

      <SectionOvernightRegister items={rows} />

      {/* <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          Created by: {SAMPLE_OVERNIGHT_AUDIT.createdBy} ·{' '}
          {formatDateTime(SAMPLE_OVERNIGHT_AUDIT.createdAt)}
        </p>
        <p>
          Last updated: {SAMPLE_OVERNIGHT_AUDIT.updatedBy} ·{' '}
          {formatDateTime(SAMPLE_OVERNIGHT_AUDIT.updatedAt)}
        </p>
      </div> */}

      {formSheet ? (
        <SheetOvernightForm
          open
          mode={formSheet.mode}
          sample={formSheet.record}
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
