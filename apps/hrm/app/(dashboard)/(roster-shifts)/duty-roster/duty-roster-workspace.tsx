'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  replaceDutyStaffAction,
  swapDutyAllocationsAction
} from '@/app/actions/roster-actions/duty-roster.actions';
import type {
  DutyRosterFilterOptions,
  DutyRosterFormOptions,
  DutyRosterRow,
  DutyRosterSummary,
  DutyRosterViewMode,
  ReplaceDutyPayload,
  SwapDutyPayload
} from '@/types/roster';
import { DutyRosterHeaderActions } from './header-actions';
import SectionDutyFilters, {
  type DutyFilterValues
} from './section-duty-filters';
import SectionDutyInstructions from './section-duty-instructions';
import SectionDutyRegister from './section-duty-register';
import SectionDutyDaysBoard from './section-duty-days-board';
import SectionDutyWeeksBoard from './section-duty-weeks-board';
import SectionDutyMonthsBoard from './section-duty-months-board';
import SectionDutySummary from './section-duty-summary';
import SheetDutyForm from './sheet-duty-form';
import SheetDutyHistory from './sheet-duty-history';
import SheetDutyReplaceForm from './sheet-duty-replace-form';
import SheetDutySwapForm from './sheet-duty-swap-form';
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
    replaceConfirmOpen,
    pendingReplace,
    requestReplaceConfirm,
    closeReplaceConfirm,
    closeFormSheet,
    closeHistorySheet
  } = useDutyRosterUi();
  const [swapLoading, setSwapLoading] = useState(false);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [leaveWarnOpen, setLeaveWarnOpen] = useState(false);
  const [leaveWarnDescription, setLeaveWarnDescription] = useState('');
  const [leaveWarnKind, setLeaveWarnKind] = useState<'swap' | 'replace' | null>(
    null
  );
  const leavePendingSwapRef = useRef<SwapDutyPayload | null>(null);
  const leavePendingReplaceRef = useRef<ReplaceDutyPayload | null>(null);

  const dutyDate = filters.dutyDate ?? new Date();

  const pushViewMode = (nextView: DutyRosterViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === 'list') params.delete('view');
    else params.set('view', nextView);
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const openLeaveWarn = (
    kind: 'swap' | 'replace',
    errors: Record<string, unknown>
  ) => {
    const softWarnings = Array.isArray(errors.softWarnings)
      ? errors.softWarnings.filter(
          (item): item is string => typeof item === 'string'
        )
      : [];
    setLeaveWarnKind(kind);
    setLeaveWarnDescription(
      softWarnings.join(' ') ||
        (typeof errors.message === 'string'
          ? errors.message
          : 'Staff has leave on this date. Continue anyway?')
    );
    setLeaveWarnOpen(true);
  };

  const runSwap = async (
    acknowledgedWarnings: boolean,
    source?: SwapDutyPayload | null
  ) => {
    const pending = source ?? pendingSwap ?? leavePendingSwapRef.current;
    if (!pending) {
      closeSwapConfirm();
      return;
    }
    setSwapLoading(true);
    const { confirmSummary: _confirmSummary, ...swapPayload } = pending;
    const result = await swapDutyAllocationsAction({
      ...swapPayload,
      ...(acknowledgedWarnings ? { acknowledgedWarnings: true } : {})
    });
    setSwapLoading(false);
    if (result.isError) {
      const errors = (result.errors ?? {}) as Record<string, unknown>;
      if (errors.requiresAck) {
        leavePendingSwapRef.current = pending;
        closeSwapConfirm();
        openLeaveWarn('swap', errors);
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (typeof errors.message === 'string' ? errors.message : undefined) ??
          'Duty shifts could not be swapped.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Success',
      description: 'Duty shifts swapped.'
    });
    leavePendingSwapRef.current = null;
    setLeaveWarnOpen(false);
    setLeaveWarnKind(null);
    closeSwapConfirm();
    closeFormSheet();
    router.refresh();
  };

  const runReplace = async (
    acknowledgedWarnings: boolean,
    source?: ReplaceDutyPayload | null
  ) => {
    const pending =
      source ?? pendingReplace ?? leavePendingReplaceRef.current;
    if (!pending) {
      closeReplaceConfirm();
      return;
    }
    setReplaceLoading(true);
    const { confirmSummary: _confirmSummary, ...replacePayload } = pending;
    const result = await replaceDutyStaffAction({
      ...replacePayload,
      ...(acknowledgedWarnings ? { acknowledgedWarnings: true } : {})
    });
    setReplaceLoading(false);
    if (result.isError) {
      const errors = (result.errors ?? {}) as Record<string, unknown>;
      if (errors.requiresAck) {
        leavePendingReplaceRef.current = pending;
        closeReplaceConfirm();
        openLeaveWarn('replace', errors);
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (typeof errors.message === 'string' ? errors.message : undefined) ??
          'Duty staff could not be replaced.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Success',
      description: 'Duty staff replaced.'
    });
    leavePendingReplaceRef.current = null;
    setLeaveWarnOpen(false);
    setLeaveWarnKind(null);
    closeReplaceConfirm();
    closeFormSheet();
    router.refresh();
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
        viewMode={viewMode}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        shiftOptions={filterOptions.shifts}
        rosterOptions={filterOptions.rosters}
        staffOptions={filterOptions.staff}
      />

      {viewMode === 'list' ? (
        <SectionDutyRegister
          items={records}
          totalRecords={totalRecords}
          page={page}
          dutyDate={dutyDate}
          viewMode={viewMode}
          onViewChange={pushViewMode}
          onExport={onExport}
        />
      ) : null}
      {viewMode === 'days' ? (
        <SectionDutyDaysBoard
          items={records}
          dutyDate={dutyDate}
          viewMode={viewMode}
          onViewChange={pushViewMode}
        />
      ) : null}
      {viewMode === 'weeks' ? (
        <SectionDutyWeeksBoard
          items={records}
          dutyDate={dutyDate}
          viewMode={viewMode}
          onViewChange={pushViewMode}
        />
      ) : null}
      {viewMode === 'months' ? (
        <SectionDutyMonthsBoard
          items={records}
          dutyDate={dutyDate}
          viewMode={viewMode}
          onViewChange={pushViewMode}
        />
      ) : null}

      {formSheet?.mode === 'swap' ? (
        <SheetDutySwapForm
          open
          record={formSheet.record}
          defaultDate={dutyDate}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
          onSwapSubmit={requestSwapConfirm}
        />
      ) : formSheet?.mode === 'replace' ? (
        <SheetDutyReplaceForm
          open
          record={formSheet.record}
          defaultDate={dutyDate}
          staffOptions={formOptions.staff}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
          onReplaceSubmit={requestReplaceConfirm}
        />
      ) : formSheet ? (
        <SheetDutyForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          defaultDate={dutyDate}
          formOptions={formOptions}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
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
        description={
          pendingSwap?.confirmSummary
            ? `${pendingSwap.confirmSummary} This exchanges their shift types on that date. Both members should be notified. Published dates must go through Roster Amendments.`
            : 'This exchanges the shift types between the two staff members on this date. Both members should be notified. Published dates must go through Roster Amendments.'
        }
        handleContinue={async () => {
          await runSwap(false);
        }}
      />

      <CustomAlertDialog
        open={replaceConfirmOpen}
        handleVisibilityChange={(open) => {
          if (!open) closeReplaceConfirm();
        }}
        loading={replaceLoading}
        title="Replace this duty staff?"
        description={
          pendingReplace?.confirmSummary
            ? `${pendingReplace.confirmSummary} The same shift and place move to the replacement. Published dates must go through Roster Amendments.`
            : 'The selected duty cell will be moved to the replacement staff member. Published dates must go through Roster Amendments.'
        }
        handleContinue={async () => {
          await runReplace(false);
        }}
      />

      <CustomAlertDialog
        open={leaveWarnOpen}
        handleVisibilityChange={(open) => {
          if (!open) {
            setLeaveWarnOpen(false);
            setLeaveWarnKind(null);
            leavePendingSwapRef.current = null;
            leavePendingReplaceRef.current = null;
          }
        }}
        loading={swapLoading || replaceLoading}
        title="Staff has leave on this date"
        description={leaveWarnDescription}
        handleContinue={async () => {
          if (leaveWarnKind === 'swap') {
            await runSwap(true, leavePendingSwapRef.current);
            return;
          }
          if (leaveWarnKind === 'replace') {
            await runReplace(true, leavePendingReplaceRef.current);
          }
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
