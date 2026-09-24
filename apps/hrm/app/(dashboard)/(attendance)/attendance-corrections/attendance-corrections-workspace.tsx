'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  approveAttendanceCorrectionsAction,
  rejectAttendanceCorrectionsAction
} from '@/app/actions/attendance-actions/attendance-correction.actions';
import type {
  AttendanceCorrectionFilterOptions,
  AttendanceCorrectionFormOptions,
  AttendanceCorrectionRecord,
  AttendanceCorrectionSummary
} from '@/types/attendance';
import { AttendanceCorrectionsHeaderActions } from './header-actions';
import SectionCorrectionFilters from './section-correction-filters';
import SectionCorrectionRegister from './section-correction-register';
import SectionCorrectionSummary from './section-correction-summary';
import SheetCorrectionForm from './sheet-correction-form';
import {
  AttendanceCorrectionsUiProvider,
  useAttendanceCorrectionsUi
} from './attendance-corrections-ui-context';

type AttendanceCorrectionsWorkspaceProps = {
  records: AttendanceCorrectionRecord[];
  totalRecords: number;
  page?: string;
  summary: AttendanceCorrectionSummary;
  initialFilters: {
    staffId?: string;
    staffCode?: string;
    department?: string;
    designation?: string;
    attendanceStatus?: string;
    correctedStatus?: string;
    requestedById?: string;
    fromDate?: string;
    toDate?: string;
  };
  filterOptions: AttendanceCorrectionFilterOptions;
  formOptions: AttendanceCorrectionFormOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function AttendanceCorrectionsWorkspaceInner({
  records,
  totalRecords,
  page,
  summary,
  initialFilters,
  filterOptions,
  formOptions,
  onExport
}: AttendanceCorrectionsWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    formSheet,
    confirmKind,
    selectedRecords,
    closeConfirm,
    closeFormSheet
  } = useAttendanceCorrectionsUi();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleApprove = async () => {
    setConfirmLoading(true);
    const result = await approveAttendanceCorrectionsAction(
      selectedRecords.map((row) => row.id)
    );
    setConfirmLoading(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not approve selected corrections.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Success',
      description: `${result.data?.count ?? selectedRecords.length} correction(s) approved and applied to Daily Attendance.`
    });
    closeConfirm();
    router.refresh();
  };

  const handleReject = async () => {
    setConfirmLoading(true);
    const result = await rejectAttendanceCorrectionsAction(
      selectedRecords.map((row) => row.id)
    );
    setConfirmLoading(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not reject selected corrections.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Success',
      description: `${result.data?.count ?? selectedRecords.length} correction(s) rejected. Daily Attendance unchanged.`
    });
    closeConfirm();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Attendance Corrections"
        description="Manual corrections to daily attendance status. Raw RFID punches stay immutable."
        actions={<AttendanceCorrectionsHeaderActions />}
      />

      <SectionCorrectionSummary summary={summary} />

      <SectionCorrectionFilters
        filterOptions={filterOptions}
        initial={initialFilters}
      />

      <SectionCorrectionRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetCorrectionForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          formOptions={formOptions}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <CustomAlertDialog
        open={confirmKind === 'approve'}
        handleVisibilityChange={(open) => {
          if (!open) closeConfirm();
        }}
        loading={confirmLoading}
        title="Approve selected corrections?"
        description="Approved corrections immediately update Daily Attendance. Device punches are not changed."
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
        title="Reject selected corrections?"
        description="Rejected corrections leave Daily Attendance unchanged."
        handleContinue={() => {
          void handleReject();
        }}
      />
    </div>
  );
}

export default function AttendanceCorrectionsWorkspace(
  props: AttendanceCorrectionsWorkspaceProps
) {
  return (
    <AttendanceCorrectionsUiProvider>
      <AttendanceCorrectionsWorkspaceInner {...props} />
    </AttendanceCorrectionsUiProvider>
  );
}
