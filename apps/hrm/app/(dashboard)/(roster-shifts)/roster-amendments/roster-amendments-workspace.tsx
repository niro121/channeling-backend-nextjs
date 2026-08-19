'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const {
    formSheet,
    historyRecord,
    confirmKind,
    selectedRecords,
    closeConfirm,
    closeFormSheet,
    closeHistorySheet
  } = useRosterAmendmentsUi();
  const [draft, setDraft] = useState<AmendmentFilterValues>(initialFilters);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    setDraft(initialFilters);
  }, [initialFilters]);

  const pushFilters = (next: AmendmentFilterValues) => {
    const params = new URLSearchParams();
    const limit = searchParams.get('limit');
    if (limit) params.set('limit', limit);
    if (next.amendmentNo.trim()) params.set('amendmentNo', next.amendmentNo.trim());
    if (next.staffSearch.trim()) params.set('staffSearch', next.staffSearch.trim());
    if (next.departmentId) params.set('department', next.departmentId);
    if (next.amendmentTypeId) params.set('amendmentType', next.amendmentTypeId);
    if (next.statusId) params.set('status', next.statusId);
    if (next.requestedById) params.set('requestedById', next.requestedById);
    if (next.fromDate) params.set('fromDate', format(next.fromDate, 'yyyy-MM-dd'));
    if (next.toDate) params.set('toDate', format(next.toDate, 'yyyy-MM-dd'));
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

  const handleApprove = async () => {
    setConfirmLoading(true);
    const result = await approveRosterAmendmentsAction(
      selectedRecords.map((row) => row.id)
    );
    setConfirmLoading(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not approve selected amendments.'
      });
      return;
    }
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
        values={draft}
        departmentOptions={filterOptions.departments}
        typeOptions={filterOptions.amendmentTypes}
        statusOptions={filterOptions.statuses}
        requesterOptions={filterOptions.requesters}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => pushFilters(draft)}
        onClear={() => pushFilters({
          amendmentNo: '',
          staffSearch: '',
          departmentId: '',
          amendmentTypeId: '',
          fromDate: null,
          toDate: null,
          statusId: '',
          requestedById: ''
        })}
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
          if (!open) closeConfirm();
        }}
        loading={confirmLoading}
        title="Approve selected amendments?"
        description="Approved amendments immediately update the published duty roster and notify affected staff and supervisors."
        handleContinue={() => {
          void handleApprove();
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
