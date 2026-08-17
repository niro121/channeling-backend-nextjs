'use client';

import { useMemo, useState } from 'react';
import { CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatDateTime } from '@/lib/utils/date';
import { DutyRosterHeaderActions } from './header-actions';
import SectionDutyFilters, {
  type DutyFilterValues
} from './section-duty-filters';
import SectionDutyRegister from './section-duty-register';
import SectionDutySummary from './section-duty-summary';
import SheetDutyForm from './sheet-duty-form';
import SheetDutyHistory from './sheet-duty-history';
import {
  SAMPLE_DUTY_AUDIT,
  SAMPLE_DUTY_DEPARTMENTS,
  SAMPLE_DUTY_ROSTERS,
  SAMPLE_DUTY_SHIFTS,
  SAMPLE_DUTY_UNITS,
  type DutyRosterSample,
  type DutyRosterSummarySample
} from './sample-data';
import { DutyRosterUiProvider, useDutyRosterUi } from './duty-roster-ui-context';

type DutyRosterWorkspaceProps = {
  initialRows: DutyRosterSample[];
  summary: DutyRosterSummarySample;
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

function filterRows(
  rows: DutyRosterSample[],
  values: DutyFilterValues
): DutyRosterSample[] {
  const unitName = SAMPLE_DUTY_UNITS.find((u) => u.id === values.unitId)?.name;
  const shiftName = SAMPLE_DUTY_SHIFTS.find(
    (s) => s.id === values.shiftId
  )?.name;

  return rows.filter((row) => {
    if (unitName && row.wardUnit !== unitName) return false;
    if (shiftName && row.shiftName !== shiftName) return false;
    return true;
  });
}

function DutyRosterWorkspaceInner({
  initialRows,
  summary
}: DutyRosterWorkspaceProps) {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const {
    formSheet,
    historyRecord,
    swapConfirmOpen,
    requestSwapConfirm,
    closeSwapConfirm,
    closeFormSheet,
    closeHistorySheet
  } = useDutyRosterUi();
  const [draft, setDraft] = useState<DutyFilterValues>(() =>
    emptyFilters(today)
  );
  const [applied, setApplied] = useState<DutyFilterValues>(() =>
    emptyFilters(today)
  );
  const [swapLoading, setSwapLoading] = useState(false);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [applied, initialRows]
  );

  const dutyDate = applied.dutyDate ?? today;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Duty Roster"
        description="Department and unit level duty roster derived from Shift Assignment. Supports swap, replacement and attendance reconciliation."
        actions={<DutyRosterHeaderActions />}
      />

      <SectionDutySummary summary={summary} />

      <SectionDutyFilters
        values={draft}
        departmentOptions={SAMPLE_DUTY_DEPARTMENTS}
        unitOptions={SAMPLE_DUTY_UNITS}
        shiftOptions={SAMPLE_DUTY_SHIFTS}
        rosterOptions={SAMPLE_DUTY_ROSTERS}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onLoad={() => {
          setApplied(draft);
          toast({
            title: 'Duty roster loaded',
            description:
              'Sample data filtered locally. Server load comes in a later phase.'
          });
        }}
        onClear={() => {
          const cleared = emptyFilters(today);
          setDraft(cleared);
          setApplied(cleared);
        }}
      />

      <SectionDutyRegister items={rows} dutyDate={dutyDate} />

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          Created by: {SAMPLE_DUTY_AUDIT.createdBy} ·{' '}
          {formatDateTime(SAMPLE_DUTY_AUDIT.createdAt)}
        </p>
        <p>
          Last updated: {SAMPLE_DUTY_AUDIT.updatedBy} ·{' '}
          {formatDateTime(SAMPLE_DUTY_AUDIT.updatedAt)}
        </p>
      </div>

      {formSheet ? (
        <SheetDutyForm
          open
          mode={formSheet.mode}
          sample={formSheet.record}
          defaultDate={dutyDate}
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
        description="The swap is recorded as a roster amendment and both staff members are notified."
        handleContinue={() => {
          setSwapLoading(true);
          toast({
            title: 'Swap shift',
            description: 'Will be wired in a later phase.'
          });
          setSwapLoading(false);
          closeSwapConfirm();
          closeFormSheet();
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
