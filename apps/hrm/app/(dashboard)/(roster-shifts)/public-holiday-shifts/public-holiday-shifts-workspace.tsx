'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { useToast } from '@archmage/ui';
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

function PublicHolidayShiftsWorkspaceInner({
  initialRows,
  totalRecords,
  summary,
  initialFilters,
  formOptions
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
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

  const [draft, setDraft] = useState<HolidayFilterValues>(appliedFromUrl);

  const pushFilters = useCallback(
    (values: HolidayFilterValues) => {
      const params = new URLSearchParams();
      if (values.holidayId) params.set('holidayId', values.holidayId);
      if (values.holidayTypeId) params.set('holidayTypeId', values.holidayTypeId);
      if (values.fromDate) params.set('fromDate', format(values.fromDate, 'yyyy-MM-dd'));
      if (values.toDate) params.set('toDate', format(values.toDate, 'yyyy-MM-dd'));
      if (values.departmentId) params.set('department', values.departmentId);
      if (values.unitId) params.set('unit', values.unitId);
      if (values.payRateId) params.set('payRate', values.payRateId);
      if (values.statusId) params.set('status', values.statusId);
      const qs = params.toString();
      router.push(qs ? `?${qs}` : '/public-holiday-shifts');
    },
    [router]
  );

  const holidayOptions = initialFilters?.holidays ?? [];
  const holidayTypeOptions = initialFilters?.holidayTypes ?? [];
  const departmentOptions = initialFilters?.departments ?? [];
  const unitOptions = initialFilters?.units ?? [];
  const payRateOptions = initialFilters?.payRates ?? [];
  const statusOptions = initialFilters?.statuses ?? [];

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
        holidayOptions={holidayOptions}
        holidayTypeOptions={holidayTypeOptions}
        departmentOptions={departmentOptions}
        unitOptions={unitOptions}
        payRateOptions={payRateOptions}
        statusOptions={statusOptions}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => pushFilters(draft)}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          pushFilters(EMPTY_FILTERS);
        }}
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
