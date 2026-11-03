'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  PublicHolidayShiftFilterOptions,
  PublicHolidayShiftFormOptions,
  PublicHolidayShiftRecord,
  PublicHolidayShiftSummary
} from '@/types/roster';
import { PublicHolidayShiftsHeaderActions } from './header-actions';
import SectionHolidayFilters, {
  type HolidayFilterValues
} from './section-holiday-filters';
import SectionHolidayRegister from './section-holiday-register';
import SectionHolidaySummary from './section-holiday-summary';
import SheetHolidayForm from './sheet-holiday-form';
import SheetHolidayHistory from './sheet-holiday-history';
import {
  PublicHolidayShiftsUiProvider,
  usePublicHolidayShiftsUi
} from './public-holiday-shifts-ui-context';

type Props = {
  initialRows: PublicHolidayShiftRecord[];
  totalRecords: number;
  summary: PublicHolidayShiftSummary;
  initialFilters: PublicHolidayShiftFilterOptions | null;
  formOptions: PublicHolidayShiftFormOptions | null;
};

function PublicHolidayShiftsWorkspaceInner({
  initialRows,
  totalRecords,
  summary,
  initialFilters,
  formOptions
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = usePublicHolidayShiftsUi();

  const appliedFromUrl = useMemo<HolidayFilterValues>(
    () => ({
      holidayId: searchParams.get('holidayId') ?? '',
      holidayTypeId: searchParams.get('holidayTypeId') ?? '',
      fromDate: searchParams.get('fromDate')
        ? new Date(`${searchParams.get('fromDate')}T00:00:00`)
        : null,
      toDate: searchParams.get('toDate')
        ? new Date(`${searchParams.get('toDate')}T00:00:00`)
        : null,
      departmentId: searchParams.get('department') ?? '',
      unitId: searchParams.get('unit') ?? '',
      payRateId: searchParams.get('payRate') ?? '',
      statusId: searchParams.get('status') ?? ''
    }),
    [searchParams]
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
        initial={appliedFromUrl}
        holidayOptions={initialFilters?.holidays ?? []}
        holidayTypeOptions={initialFilters?.holidayTypes ?? []}
        departmentOptions={initialFilters?.departments ?? []}
        unitOptions={initialFilters?.units ?? []}
        payRateOptions={initialFilters?.payRates ?? []}
        statusOptions={initialFilters?.statuses ?? []}
      />

      <SectionHolidayRegister
        items={initialRows}
        totalCount={totalRecords}
      />

      {formSheet ? (
        <SheetHolidayForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          selectedCount={formSheet.selectedCount}
          formOptions={formOptions}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
          onSaved={() => {
            closeFormSheet();
            router.refresh();
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

export default function PublicHolidayShiftsWorkspace(props: Props) {
  return (
    <PublicHolidayShiftsUiProvider>
      <PublicHolidayShiftsWorkspaceInner {...props} />
    </PublicHolidayShiftsUiProvider>
  );
}
