'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  NightShiftFilterOptions,
  NightShiftFormOptions,
  NightShiftRecord,
  NightShiftSummary
} from '@/types/roster';
import { NightShiftsHeaderActions } from './header-actions';
import SectionNightFilters, {
  type NightFilterValues
} from './section-night-filters';
import SectionNightRegister from './section-night-register';
import SectionNightSummary from './section-night-summary';
import SheetNightShiftForm from './sheet-night-shift-form';
import SheetNightShiftHistory from './sheet-night-shift-history';
import {
  NightShiftsUiProvider,
  useNightShiftsUi
} from './night-shifts-ui-context';

type NightShiftsWorkspaceProps = {
  records: NightShiftRecord[];
  totalRecords: number;
  page?: string;
  summary: NightShiftSummary;
  initialFilters: NightFilterValues;
  filterOptions: NightShiftFilterOptions;
  formOptions: NightShiftFormOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function NightShiftsWorkspaceInner({
  records,
  totalRecords,
  page,
  summary,
  initialFilters,
  filterOptions,
  formOptions,
  onExport
}: NightShiftsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { formSheet, historyRecord, closeFormSheet, closeHistorySheet } =
    useNightShiftsUi();
  const [draft, setDraft] = useState<NightFilterValues>(initialFilters);

  useEffect(() => {
    setDraft(initialFilters);
  }, [initialFilters]);

  const pushFilters = (next: NightFilterValues) => {
    const params = new URLSearchParams();
    const limit = searchParams.get('limit');
    if (limit) params.set('limit', limit);
    if (next.fromDate) params.set('fromDate', format(next.fromDate, 'yyyy-MM-dd'));
    if (next.toDate) params.set('toDate', format(next.toDate, 'yyyy-MM-dd'));
    if (next.departmentId) params.set('department', next.departmentId);
    if (next.unitId) params.set('unit', next.unitId);
    if (next.shiftTypeId) params.set('shiftTypeId', next.shiftTypeId);
    if (next.staffSearch.trim()) params.set('staffSearch', next.staffSearch.trim());
    if (next.statusId) params.set('status', next.statusId);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

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
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        shiftTypeOptions={filterOptions.shiftTypes}
        statusOptions={filterOptions.statuses}
        salaryCycleOptions={[]}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => pushFilters(draft)}
        onClear={() =>
          pushFilters({
            fromDate: null,
            toDate: null,
            departmentId: '',
            unitId: '',
            shiftTypeId: '',
            staffSearch: '',
            statusId: '',
            salaryCycleId: ''
          })
        }
      />

      <SectionNightRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetNightShiftForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          formOptions={formOptions}
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
