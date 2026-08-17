'use client';

import { useMemo, useState } from 'react';
import { CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatDateTime } from '@/lib/utils/date';
import { RosterAmendmentsHeaderActions } from './header-actions';
import SectionAmendmentFilters, {
  type AmendmentFilterValues
} from './section-amendment-filters';
import SectionAmendmentRegister from './section-amendment-register';
import SectionAmendmentSummary from './section-amendment-summary';
import SheetAmendmentForm from './sheet-amendment-form';
import SheetAmendmentHistory from './sheet-amendment-history';
import {
  SAMPLE_AMENDMENT_AUDIT,
  SAMPLE_AMENDMENT_DEPARTMENTS,
  SAMPLE_AMENDMENT_REQUESTERS,
  SAMPLE_AMENDMENT_STATUS,
  SAMPLE_AMENDMENT_TYPES,
  type AmendmentSummarySample,
  type RosterAmendmentSample
} from './sample-data';
import {
  RosterAmendmentsUiProvider,
  useRosterAmendmentsUi
} from './roster-amendments-ui-context';

type RosterAmendmentsWorkspaceProps = {
  initialRows: RosterAmendmentSample[];
  summary: AmendmentSummarySample;
};

const EMPTY_FILTERS: AmendmentFilterValues = {
  amendmentNo: '',
  staffSearch: '',
  departmentId: '',
  amendmentTypeId: '',
  fromDate: null,
  toDate: null,
  statusId: '',
  requestedById: ''
};

const LATER = 'Will be wired in a later phase.';

function toDayStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function filterRows(
  rows: RosterAmendmentSample[],
  values: AmendmentFilterValues
): RosterAmendmentSample[] {
  const amendmentNo = values.amendmentNo.trim().toLowerCase();
  const staffQ = values.staffSearch.trim().toLowerCase();
  const deptName = SAMPLE_AMENDMENT_DEPARTMENTS.find(
    (d) => d.id === values.departmentId
  )?.name;
  const from = values.fromDate ? toDayStart(values.fromDate) : null;
  const to = values.toDate ? toDayStart(values.toDate) : null;

  return rows.filter((row) => {
    if (amendmentNo && !row.amendmentNo.toLowerCase().includes(amendmentNo)) {
      return false;
    }
    if (staffQ) {
      const hay = `${row.staffCode} ${row.staffName}`.toLowerCase();
      if (!hay.includes(staffQ)) return false;
    }
    if (deptName && row.department !== deptName) return false;
    if (values.amendmentTypeId && row.amendmentTypeId !== values.amendmentTypeId) {
      return false;
    }
    if (values.statusId && row.status !== values.statusId) return false;
    if (values.requestedById && row.requestedById !== values.requestedById) {
      return false;
    }
    if (from || to) {
      const roster = toDayStart(new Date(`${row.rosterDate}T00:00:00`));
      if (from && roster < from) return false;
      if (to && roster > to) return false;
    }
    return true;
  });
}

function RosterAmendmentsWorkspaceInner({
  initialRows,
  summary
}: RosterAmendmentsWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    historyRecord,
    confirmKind,
    closeConfirm,
    closeFormSheet,
    closeHistorySheet
  } = useRosterAmendmentsUi();
  const [draft, setDraft] = useState<AmendmentFilterValues>(EMPTY_FILTERS);
  const [applied, setApplied] =
    useState<AmendmentFilterValues>(EMPTY_FILTERS);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [applied, initialRows]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Roster Amendments"
        description="Controlled change workflow for published duty rosters. Approved amendments update the Duty Roster and Shift Roster instantly."
        actions={<RosterAmendmentsHeaderActions />}
      />

      <SectionAmendmentSummary summary={summary} />

      <SectionAmendmentFilters
        values={draft}
        departmentOptions={SAMPLE_AMENDMENT_DEPARTMENTS}
        typeOptions={SAMPLE_AMENDMENT_TYPES}
        statusOptions={SAMPLE_AMENDMENT_STATUS}
        requesterOptions={SAMPLE_AMENDMENT_REQUESTERS}
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

      <SectionAmendmentRegister items={rows} />

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          Created by: {SAMPLE_AMENDMENT_AUDIT.createdBy} ·{' '}
          {formatDateTime(SAMPLE_AMENDMENT_AUDIT.createdAt)}
        </p>
        <p>
          Last updated: {SAMPLE_AMENDMENT_AUDIT.updatedBy} ·{' '}
          {formatDateTime(SAMPLE_AMENDMENT_AUDIT.updatedAt)}
        </p>
      </div>

      {formSheet ? (
        <SheetAmendmentForm
          open
          mode={formSheet.mode}
          sample={formSheet.record}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <SheetAmendmentHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />

      <CustomAlertDialog
        open={confirmKind === 'approve'}
        handleVisibilityChange={(open) => {
          if (!open) closeConfirm();
        }}
        loading={confirmLoading}
        title="Approve selected amendments?"
        description="Approved amendments immediately update the published duty roster and notify affected staff and supervisors."
        handleContinue={() => {
          setConfirmLoading(true);
          toast({ title: 'Approve amendments', description: LATER });
          setConfirmLoading(false);
          closeConfirm();
        }}
      />

      <CustomAlertDialog
        open={confirmKind === 'reject'}
        handleVisibilityChange={(open) => {
          if (!open) closeConfirm();
        }}
        loading={confirmLoading}
        title="Reject selected amendments?"
        description="Rejected amendments leave the original roster unchanged. Remarks are mandatory for audit."
        handleContinue={() => {
          setConfirmLoading(true);
          toast({ title: 'Reject amendments', description: LATER });
          setConfirmLoading(false);
          closeConfirm();
        }}
      />
    </div>
  );
}

export default function RosterAmendmentsWorkspace(
  props: RosterAmendmentsWorkspaceProps
) {
  return (
    <RosterAmendmentsUiProvider>
      <RosterAmendmentsWorkspaceInner {...props} />
    </RosterAmendmentsUiProvider>
  );
}
