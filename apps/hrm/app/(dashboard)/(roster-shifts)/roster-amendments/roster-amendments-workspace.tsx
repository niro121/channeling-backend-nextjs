'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  approveRosterAmendmentsAction,
  rejectRosterAmendmentsAction
} from '@/app/actions/roster-actions/roster-amendment.actions';
import type {
  RosterAmendmentFilterOptions,
  RosterAmendmentFormOptions,
  RosterAmendmentRecord,
  RosterAmendmentSummary
} from '@/types/roster';
import { RosterAmendmentsHeaderActions } from './header-actions';
import SectionAmendmentFilters, {
  type AmendmentFilterValues
} from './section-amendment-filters';
import SectionAmendmentRegister from './section-amendment-register';
import SectionAmendmentSummary from './section-amendment-summary';
import SheetAmendmentForm from './sheet-amendment-form';
import SheetAmendmentHistory from './sheet-amendment-history';
import {
  RosterAmendmentsUiProvider,
  useRosterAmendmentsUi
} from './roster-amendments-ui-context';

type RosterAmendmentsWorkspaceProps = {
  records: RosterAmendmentRecord[];
  totalRecords: number;
  page?: string;
  summary: RosterAmendmentSummary;
  initialFilters: AmendmentFilterValues;
  filterOptions: RosterAmendmentFilterOptions;
  formOptions: RosterAmendmentFormOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function RosterAmendmentsWorkspaceInner({
  records,
  totalRecords,
  page,
  summary,
  initialFilters,
  filterOptions,
  formOptions,
  onExport
}: RosterAmendmentsWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    formSheet,
    historyRecord,
    confirmKind,
    selectedRecords,
    closeConfirm,
    closeFormSheet,
    closeHistorySheet
  } = useRosterAmendmentsUi();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [softWarnOpen, setSoftWarnOpen] = useState(false);
  const [softWarnDescription, setSoftWarnDescription] = useState('');
  const pendingApproveAckRef = useRef(false);

  const handleApprove = async (acknowledgedWarnings = false) => {
    setConfirmLoading(true);
    const result = await approveRosterAmendmentsAction(
      selectedRecords.map((row) => row.id),
      null,
      acknowledgedWarnings
    );
    setConfirmLoading(false);

    if (result.isError) {
      const errorMap = result.errors as Record<
        string,
        string | string[] | boolean | undefined
      >;
      if (errorMap.requiresAck) {
        const softWarnings = Array.isArray(errorMap.softWarnings)
          ? errorMap.softWarnings.filter(
              (item): item is string => typeof item === 'string'
            )
          : [];
        setSoftWarnDescription(
          softWarnings.join(' ') ||
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : 'One or more selected staff have leave or weekly off on the amendment date. Continue anyway?')
        );
        closeConfirm();
        setSoftWarnOpen(true);
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (typeof errorMap.message === 'string'
            ? errorMap.message
            : undefined) ?? 'Could not approve selected amendments.'
      });
      return;
    }

    pendingApproveAckRef.current = false;
    setSoftWarnOpen(false);
    toast({
      variant: 'success',
      title: 'Success',
      description: `${result.data?.count ?? selectedRecords.length} amendment(s) approved and applied to the roster.`
    });
    closeConfirm();
    router.refresh();
  };

  const handleReject = async () => {
    setConfirmLoading(true);
    const result = await rejectRosterAmendmentsAction(
      selectedRecords.map((row) => row.id)
    );
    setConfirmLoading(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not reject selected amendments.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Success',
      description: `${result.data?.count ?? selectedRecords.length} amendment(s) rejected. Original roster unchanged.`
    });
    closeConfirm();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Roster Amendments"
        description="Controlled change workflow for published duty rosters. Approved amendments update the Duty Roster and Shift Roster instantly."
        actions={<RosterAmendmentsHeaderActions />}
      />

      <SectionAmendmentSummary summary={summary} />

      <SectionAmendmentFilters
        initial={initialFilters}
        departmentOptions={filterOptions.departments}
        typeOptions={filterOptions.amendmentTypes}
        statusOptions={filterOptions.statuses}
        requesterOptions={filterOptions.requesters}
      />

      <SectionAmendmentRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetAmendmentForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          formOptions={formOptions}
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
          if (!open) {
            pendingApproveAckRef.current = false;
            closeConfirm();
          }
        }}
        loading={confirmLoading}
        title="Approve selected amendments?"
        description="Approved amendments immediately update the published duty roster and notify affected staff and supervisors."
        handleContinue={() => {
          void handleApprove(pendingApproveAckRef.current);
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
          void handleReject();
        }}
      />

      <CustomAlertDialog
        open={softWarnOpen}
        title="Confirm roster warning"
        description={softWarnDescription}
        loading={confirmLoading}
        handleVisibilityChange={(nextOpen) => {
          if (!nextOpen) {
            pendingApproveAckRef.current = false;
          }
          setSoftWarnOpen(nextOpen);
        }}
        handleContinue={async () => {
          pendingApproveAckRef.current = true;
          setSoftWarnOpen(false);
          await handleApprove(true);
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
