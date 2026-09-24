'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatDateTime } from '@/lib/utils/date';
import { swapDutyAllocationsAction } from '@/app/actions/roster-actions/duty-roster.actions';
import type {
  DutyRosterFilterOptions,
  DutyRosterFormOptions,
  DutyRosterRow,
  DutyRosterSummary,
  DutyRosterViewMode
} from '@/types/roster';
import { DutyRosterHeaderActions } from './header-actions';
import SectionDutyFilters, {
  type DutyFilterValues
} from './section-duty-filters';
import SectionDutyInstructions from './section-duty-instructions';
import SectionDutyRegister from './section-duty-register';
import SectionDutySummary from './section-duty-summary';
import SheetDutyForm from './sheet-duty-form';
import SheetDutyHistory from './sheet-duty-history';
import { DutyRosterUiProvider, useDutyRosterUi } from './duty-roster-ui-context';

type DutyRosterWorkspaceProps = {
  records: DutyRosterRow[];
  totalRecords: number;
  page?: string;
  filters: DutyFilterValues;
  viewMode: DutyRosterViewMode;
  summary: DutyRosterSummary;
  filterOptions: DutyRosterFilterOptions;
  formOptions: DutyRosterFormOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function emptyFilters(today: Date): DutyFilterValues {
  return {
    departmentId: '',
    unitId: '',
    dutyDate: today,
    shiftId: '',
    rosterId: ''
  };
}

function DutyRosterWorkspaceInner({
  records,
  totalRecords,
  page,
  filters,
  viewMode,
  summary,
  filterOptions,
  formOptions,
  onExport
}: DutyRosterWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    formSheet,
    historyRecord,
    swapConfirmOpen,
    pendingSwap,
    requestSwapConfirm,
    closeSwapConfirm,
    closeFormSheet,
    closeHistorySheet
  } = useDutyRosterUi();
  const [draft, setDraft] = useState<DutyFilterValues>(filters);
  const [swapLoading, setSwapLoading] = useState(false);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const dutyDate = filters.dutyDate ?? new Date();

  const pushFilters = (
    next: DutyFilterValues,
    nextView: DutyRosterViewMode = viewMode
  ) => {
    const params = new URLSearchParams();
    const limit = searchParams.get('limit');
    if (limit) params.set('limit', limit);
    if (next.departmentId) params.set('department', next.departmentId);
    if (next.unitId) params.set('unit', next.unitId);
    if (next.shiftId) params.set('shiftTypeId', next.shiftId);
    if (next.rosterId) params.set('roster', next.rosterId);
    if (next.dutyDate) params.set('dutyDate', format(next.dutyDate, 'yyyy-MM-dd'));
    if (nextView !== 'daily') params.set('view', nextView);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const latest = records[0];

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Duty Roster"
        description="Department and unit level duty roster derived from Shift Assignment. Supports swap, replacement and attendance reconciliation."
        actions={<DutyRosterHeaderActions />}
      />

      <SectionDutySummary summary={summary} viewMode={viewMode} />

      <SectionDutyInstructions />

      <SectionDutyFilters
        values={draft}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        shiftOptions={filterOptions.shifts}
        rosterOptions={filterOptions.rosters}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onLoad={() => pushFilters(draft)}
        onClear={() => {
          const cleared = emptyFilters(new Date());
          setDraft(cleared);
          pushFilters(cleared, 'daily');
        }}
      />

      <SectionDutyRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        dutyDate={dutyDate}
        viewMode={viewMode}
        onViewChange={(mode) => pushFilters(filters, mode)}
        onExport={onExport}
      />

      {/* <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          Created by: {latest?.createdUser?.name || latest?.createdBy || '—'}
          {latest?.createdAt
            ? ` · ${formatDateTime(latest.createdAt)}`
            : null}
        </p>
        <p>
          Last updated: {latest?.updatedUser?.name || latest?.updatedBy || '—'}
          {latest?.updatedAt
            ? ` · ${formatDateTime(latest.updatedAt)}`
            : null}
        </p>
      </div> */}

      {formSheet ? (
        <SheetDutyForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          defaultDate={dutyDate}
          formOptions={formOptions}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
          onSwapSubmit={requestSwapConfirm}
        />
      ) : null}

      <SheetDutyHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />

      <CustomAlertDialog
        open={swapConfirmOpen}
        handleVisibilityChange={(open) => {
          if (!open) closeSwapConfirm();
        }}
        loading={swapLoading}
        title="Swap this duty shift?"
        description="This exchanges the shift types between the two staff members on this date. Published dates must go through Roster Amendments."
        handleContinue={async () => {
          if (!pendingSwap) {
            closeSwapConfirm();
            return;
          }
          setSwapLoading(true);
          const result = await swapDutyAllocationsAction(pendingSwap);
          setSwapLoading(false);
          if (result.isError) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description:
                (result.errors as { message?: string })?.message ??
                'Duty shifts could not be swapped.'
            });
            return;
          }
          toast({
            variant: 'success',
            title: 'Success',
            description: 'Duty shifts swapped.'
          });
          closeSwapConfirm();
          closeFormSheet();
          router.refresh();
        }}
      />
    </div>
  );
}

export default function DutyRosterWorkspace(props: DutyRosterWorkspaceProps) {
  return (
    <DutyRosterUiProvider>
      <DutyRosterWorkspaceInner {...props} />
    </DutyRosterUiProvider>
  );
}
