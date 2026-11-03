'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  PaysheetAssignmentFilters,
  PaysheetAssignmentRecord,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import {
  AssignPaysheetUiProvider,
  useAssignPaysheetUi
} from './assign-paysheet-ui-context';
import { AssignPaysheetHeaderActions } from './header-actions';
import DialogAssignmentView from './dialog-assignment-view';
import SectionFilters from './section-filters';
import SectionRegister from './section-register';
import SheetAssignmentForm from './sheet-assignment-form';
import SheetAssignmentHistory from './sheet-assignment-history';

type AssignPaysheetWorkspaceProps = {
  initialRecords: PaysheetAssignmentRecord[];
  totalRecords: number;
  page?: string;
  componentOptions?: PaysheetComponentOption[];
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
  initialFilters?: PaysheetAssignmentFilters;
};

function AssignPaysheetWorkspaceInner({
  initialRecords,
  totalRecords,
  page,
  componentOptions = [],
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = [],
  initialFilters
}: AssignPaysheetWorkspaceProps) {
  const {
    formSheet,
    historyRecord,
    viewRecord,
    closeFormSheet,
    closeHistory,
    closeView
  } = useAssignPaysheetUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Assign Paysheet Component"
        description="Assign individual paysheet components (allowances, deductions) to staff with effective date ranges."
        actions={<AssignPaysheetHeaderActions />}
      />

      <SectionFilters
        staffOptions={staffOptions}
        componentOptions={componentOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        rosterOptions={rosterOptions}
        initial={initialFilters}
      />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        initialFilters={initialFilters}
      />

      <SheetAssignmentForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        staffOptions={staffOptions}
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

export default function AssignPaysheetWorkspace(
  props: AssignPaysheetWorkspaceProps
) {
  return (
    <AssignPaysheetUiProvider>
      <AssignPaysheetWorkspaceInner {...props} />
    </AssignPaysheetUiProvider>
  );
}
