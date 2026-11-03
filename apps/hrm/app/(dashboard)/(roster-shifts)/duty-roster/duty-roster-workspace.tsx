'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
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
  const [swapLoading, setSwapLoading] = useState(false);

  const dutyDate = filters.dutyDate ?? new Date();

  const pushViewMode = (nextView: DutyRosterViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === 'daily') params.delete('view');
    else params.set('view', nextView);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

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
        initial={filters}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        shiftOptions={filterOptions.shifts}
        rosterOptions={filterOptions.rosters}
      />

      <SectionDutyRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        dutyDate={dutyDate}
        viewMode={viewMode}
        onViewChange={pushViewMode}
        onExport={onExport}
      />

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
