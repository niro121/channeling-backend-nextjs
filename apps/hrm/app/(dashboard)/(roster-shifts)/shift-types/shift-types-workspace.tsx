'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  SHIFT_TYPE_CATEGORY_OPTIONS,
  SHIFT_TYPE_STATUS_OPTIONS,
  ROSTER_YES_NO_OPTIONS,
  type ShiftTypeRecord,
  type ShiftTypeSummary
} from '@/types/roster';
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

const EMPTY_FILTERS: ShiftTypeFilterValues = {
  code: '',
  name: '',
  categoryId: '',
  nightShift: '',
  overnight: '',
  status: ''
};

function ShiftTypesWorkspaceInner({
  records,
  totalRecords,
  page,
  filters,
  summary,
  onExport
}: ShiftTypesWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formSheet, historyRecord, closeFormSheet, closeHistorySheet } =
    useShiftTypesUi();
  const [draft, setDraft] = useState<ShiftTypeFilterValues>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const pushFilters = (next: ShiftTypeFilterValues) => {
    const params = new URLSearchParams();
    const limit = searchParams.get('limit');
    if (limit) params.set('limit', limit);
    if (next.code.trim()) params.set('code', next.code.trim());
    if (next.name.trim()) params.set('name', next.name.trim());
    if (next.categoryId) params.set('category', next.categoryId);
    if (next.nightShift) params.set('nightShift', next.nightShift);
    if (next.overnight) params.set('overnight', next.overnight);
    if (next.status) params.set('status', next.status);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

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
        categoryOptions={SHIFT_TYPE_CATEGORY_OPTIONS}
        yesNoOptions={ROSTER_YES_NO_OPTIONS}
        statusOptions={SHIFT_TYPE_STATUS_OPTIONS}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => pushFilters(draft)}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          const limit = searchParams.get('limit');
          router.push(limit ? `${pathname}?limit=${limit}` : pathname);
        }}
      />

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
