'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatDateTime } from '@/lib/utils/date';
import { PublicHolidayShiftsHeaderActions } from './header-actions';
import SectionHolidayFilters, {
  type HolidayFilterValues
} from './section-holiday-filters';
import SectionHolidayRegister from './section-holiday-register';
import SectionHolidaySummary from './section-holiday-summary';
import SheetHolidayForm from './sheet-holiday-form';
import SheetHolidayHistory from './sheet-holiday-history';
import {
  SAMPLE_HOLIDAY_AUDIT,
  SAMPLE_HOLIDAY_DEPARTMENTS,
  SAMPLE_HOLIDAY_PAY_RATES,
  SAMPLE_HOLIDAY_STATUS,
  SAMPLE_HOLIDAY_TYPES,
  SAMPLE_HOLIDAY_UNITS,
  SAMPLE_PUBLIC_HOLIDAYS,
  type PublicHolidayShiftSample,
  type PublicHolidaySummarySample
} from './sample-data';
import {
  PublicHolidayShiftsUiProvider,
  usePublicHolidayShiftsUi
} from './public-holiday-shifts-ui-context';

type PublicHolidayShiftsWorkspaceProps = {
  initialRows: PublicHolidayShiftSample[];
  summary: PublicHolidaySummarySample;
};

const EMPTY_FILTERS: HolidayFilterValues = {
  holidayId: '',
  holidayTypeId: '',
  fromDate: null,
  toDate: null,
  departmentId: '',
  unitId: '',
  payRateId: '',
  statusId: ''
};

function toDayStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function filterRows(
  rows: PublicHolidayShiftSample[],
  values: HolidayFilterValues
): PublicHolidayShiftSample[] {
  const from = values.fromDate ? toDayStart(values.fromDate) : null;
  const to = values.toDate ? toDayStart(values.toDate) : null;

  return rows.filter((row) => {
    if (values.holidayId && row.holidayId !== values.holidayId) return false;
    if (values.holidayTypeId && row.holidayTypeId !== values.holidayTypeId) {
      return false;
    }
    if (values.departmentId) {
      const dept = SAMPLE_HOLIDAY_DEPARTMENTS.find(
        (d) => d.id === values.departmentId
      )?.name;
      if (dept && row.department !== dept) return false;
    }
    if (values.unitId) {
      const unit = SAMPLE_HOLIDAY_UNITS.find(
        (u) => u.id === values.unitId
      )?.name;
      if (unit && row.unit !== unit) return false;
    }
    if (values.payRateId && row.payRate !== values.payRateId) return false;
    if (values.statusId && row.status !== values.statusId) return false;
    if (from || to) {
      const dutyDay = toDayStart(new Date(`${row.dutyDate}T00:00:00`));
      if (from && dutyDay < from) return false;
      if (to && dutyDay > to) return false;
    }
    return true;
  });
}

function PublicHolidayShiftsWorkspaceInner({
  initialRows,
  summary
}: PublicHolidayShiftsWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = usePublicHolidayShiftsUi();
  const [draft, setDraft] = useState<HolidayFilterValues>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<HolidayFilterValues>(EMPTY_FILTERS);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [applied, initialRows]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Public Holiday Shifts"
        description="Roster staff on gazetted holidays with holiday pay rates, lieu leave, and payroll posting."
        actions={<PublicHolidayShiftsHeaderActions />}
      />

      <SectionHolidaySummary summary={summary} />

      <SectionHolidayFilters
        values={draft}
        holidayOptions={SAMPLE_PUBLIC_HOLIDAYS}
        holidayTypeOptions={SAMPLE_HOLIDAY_TYPES}
        departmentOptions={SAMPLE_HOLIDAY_DEPARTMENTS}
        unitOptions={SAMPLE_HOLIDAY_UNITS}
        payRateOptions={SAMPLE_HOLIDAY_PAY_RATES}
        statusOptions={SAMPLE_HOLIDAY_STATUS}
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

      <SectionHolidayRegister items={rows} />

      {/* <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          Created by: {SAMPLE_HOLIDAY_AUDIT.createdBy} ·{' '}
          {formatDateTime(SAMPLE_HOLIDAY_AUDIT.createdAt)}
        </p>
        <p>
          Last updated: {SAMPLE_HOLIDAY_AUDIT.updatedBy} ·{' '}
          {formatDateTime(SAMPLE_HOLIDAY_AUDIT.updatedAt)}
        </p>
      </div> */}

      {formSheet ? (
        <SheetHolidayForm
          open
          mode={formSheet.mode}
          sample={formSheet.record}
          selectedCount={formSheet.selectedCount}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <SheetHolidayHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />
    </div>
  );
}

export default function PublicHolidayShiftsWorkspace(
  props: PublicHolidayShiftsWorkspaceProps
) {
  return (
    <PublicHolidayShiftsUiProvider>
      <PublicHolidayShiftsWorkspaceInner {...props} />
    </PublicHolidayShiftsUiProvider>
  );
}
