'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@archmage/ui';
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
  onExport: () => Promise<{ success: boolean; data?: Record<string, unknown>[]; message?: string }>;
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
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useOvernightShiftsUi();

  const applyFilters = useCallback(
    (values: OvernightFilterValues) => {
      const params = new URLSearchParams();
      if (values.fromDate) params.set('fromDate', values.fromDate.toISOString().slice(0, 10));
      if (values.toDate) params.set('toDate', values.toDate.toISOString().slice(0, 10));
      if (values.departmentId) params.set('department', values.departmentId);
      if (values.unitId) params.set('unit', values.unitId);
      if (values.shiftTypeId) params.set('shiftTypeId', values.shiftTypeId);
      if (values.allocationId) params.set('allocationDate', values.allocationId);
      if (values.staffSearch) params.set('staffSearch', values.staffSearch);
      if (values.statusId) params.set('status', values.statusId);
      const limit = searchParams.get('limit');
      if (limit) params.set('limit', limit);
      router.push(`/overnight-shifts?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    const limit = searchParams.get('limit');
    router.push(limit ? `/overnight-shifts?limit=${limit}` : '/overnight-shifts');
  }, [router, searchParams]);

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Overnight Shifts"
        description="Shifts crossing midnight, with day-split hours and attendance date allocation so RFID punches reconcile against the correct roster day."
        actions={<OvernightShiftsHeaderActions />}
      />

      <SectionOvernightSummary summary={summary} />

      <SectionOvernightFilters
        values={initialFilters}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        shiftTypeOptions={filterOptions.shiftTypes}
        allocationOptions={filterOptions.allocationOptions}
        statusOptions={filterOptions.statuses}
        onChange={() => undefined}
        onSearch={applyFilters}
        onClear={clearFilters}
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
