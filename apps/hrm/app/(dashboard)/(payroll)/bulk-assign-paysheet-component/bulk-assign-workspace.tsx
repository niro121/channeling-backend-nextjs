'use client';

import { useMemo, useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_BULK_PAYSHEET_SUMMARY,
  type BulkPaysheetStaffFilters,
  type BulkPaysheetStaffRow,
  type PaysheetAssignmentRecord,
  type PaysheetStaffOption,
  type SalaryFilterOption
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
  staffRows: BulkPaysheetStaffRow[];
  totalStaff: number;
  page?: string;
  recentRecords: PaysheetAssignmentRecord[];
  componentOptions?: PaysheetComponentOption[];
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
  initialFilters?: BulkPaysheetStaffFilters;
};

function BulkAssignWorkspaceInner({
  staffRows,
  totalStaff,
  page,
  recentRecords,
  componentOptions = [],
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = [],
  initialFilters
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

  const [assignedThisBatch, setAssignedThisBatch] = useState(0);
  const [removed, setRemoved] = useState(0);
  const [sessionRecent, setSessionRecent] = useState<PaysheetAssignmentRecord[]>(
    []
  );

  const displayRecent = useMemo(() => {
    const byId = new Map<string, PaysheetAssignmentRecord>();
    for (const row of [...sessionRecent, ...recentRecords]) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    return Array.from(byId.values()).slice(0, 40);
  }, [sessionRecent, recentRecords]);

  const summary = useMemo(
    () => ({
      ...EMPTY_BULK_PAYSHEET_SUMMARY,
      selected: selectedStaffIds.length,
      totalMatches: totalStaff,
      assignedThisBatch,
      removed
    }),
    [selectedStaffIds.length, totalStaff, assignedThisBatch, removed]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Bulk assign paysheet component"
        description="Assign a paysheet component to many staff at once (merged single-page workflow)."
      />

      <SectionSummary summary={summary} />

      <SectionFilters
        staffOptions={staffOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        rosterOptions={rosterOptions}
        initial={initialFilters}
      />

      <SectionStaffRegister
        records={staffRows}
        totalRecords={totalStaff}
        page={page}
      />

      <SectionBulkForm
        componentOptions={componentOptions}
        onAssigned={(count, created) => {
          setAssignedThisBatch((value) => value + count);
          if (created?.length) {
            setSessionRecent((prev) => [...created, ...prev]);
          }
        }}
        onRemoved={(count) => setRemoved((value) => value + count)}
      />

      <SectionRecentRegister
        records={displayRecent}
        totalRecords={displayRecent.length}
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

export default function BulkAssignWorkspace(props: BulkAssignWorkspaceProps) {
  return (
    <BulkAssignUiProvider>
      <BulkAssignWorkspaceInner {...props} />
    </BulkAssignUiProvider>
  );
}
