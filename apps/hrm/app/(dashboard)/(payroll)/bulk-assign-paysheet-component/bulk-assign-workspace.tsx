'use client';

import { useMemo, useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_BULK_PAYSHEET_SUMMARY,
  type BulkPaysheetStaffRow,
  type PaysheetAssignmentRecord
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import {
  BulkAssignUiProvider,
  useBulkAssignUi
} from './bulk-assign-ui-context';
import DialogAssignmentView from './dialog-assignment-view';
import SectionBulkForm from './section-bulk-form';
import SectionFilters from './section-filters';
import SectionRecentRegister from './section-recent-register';
import SectionStaffRegister from './section-staff-register';
import SectionSummary from './section-summary';
import SheetAssignmentForm from './sheet-assignment-form';
import SheetAssignmentHistory from './sheet-assignment-history';

type BulkAssignWorkspaceProps = {
  componentOptions?: PaysheetComponentOption[];
};

function BulkAssignWorkspaceInner({
  componentOptions = []
}: BulkAssignWorkspaceProps) {
  const {
    formSheet,
    historyRecord,
    viewRecord,
    selectedStaffIds,
    closeFormSheet,
    closeHistory,
    closeView
  } = useBulkAssignUi();

  const [staffRows] = useState<BulkPaysheetStaffRow[]>([]);
  const [recentRecords] = useState<PaysheetAssignmentRecord[]>([]);
  const [assignedThisBatch, setAssignedThisBatch] = useState(0);
  const [removed, setRemoved] = useState(0);

  const summary = useMemo(
    () => ({
      ...EMPTY_BULK_PAYSHEET_SUMMARY,
      selected: selectedStaffIds.length,
      totalMatches: staffRows.length,
      assignedThisBatch,
      removed
    }),
    [selectedStaffIds.length, staffRows.length, assignedThisBatch, removed]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Bulk assign paysheet component"
        description="Assign a paysheet component to many staff at once (merged single-page workflow)."
      />

      <SectionSummary summary={summary} />

      <SectionFilters />

      <SectionStaffRegister
        records={staffRows}
        totalRecords={staffRows.length}
      />

      <SectionBulkForm
        componentOptions={componentOptions}
        onAssigned={(count) =>
          setAssignedThisBatch((value) => value + count)
        }
        onRemoved={(count) => setRemoved((value) => value + count)}
      />

      <SectionRecentRegister
        records={recentRecords}
        totalRecords={recentRecords.length}
      />

      <SheetAssignmentForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'edit'}
        record={formSheet?.record ?? null}
        componentOptions={componentOptions}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />

      <SheetAssignmentHistory
        open={historyRecord != null}
        record={historyRecord}
        onOpenChange={(open) => {
          if (!open) closeHistory();
        }}
      />

      <DialogAssignmentView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />
    </div>
  );
}

export default function BulkAssignWorkspace({
  componentOptions = []
}: BulkAssignWorkspaceProps) {
  return (
    <BulkAssignUiProvider>
      <BulkAssignWorkspaceInner componentOptions={componentOptions} />
    </BulkAssignUiProvider>
  );
}
