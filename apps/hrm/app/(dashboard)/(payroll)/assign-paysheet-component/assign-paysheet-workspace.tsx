'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { PaysheetAssignmentRecord } from '@/types/payroll';
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

function AssignPaysheetWorkspaceInner() {
  const {
    formSheet,
    historyRecord,
    viewRecord,
    closeFormSheet,
    closeHistory,
    closeView
  } = useAssignPaysheetUi();
  const [records] = useState<PaysheetAssignmentRecord[]>([]);

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Assign Paysheet Component"
        description="Assign individual paysheet components (allowances, deductions) to staff with effective date ranges."
        actions={<AssignPaysheetHeaderActions />}
      />

      <SectionFilters />

      <SectionRegister records={records} totalRecords={records.length} />

      <SheetAssignmentForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        staffOptions={[]}
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

export default function AssignPaysheetWorkspace() {
  return (
    <AssignPaysheetUiProvider>
      <AssignPaysheetWorkspaceInner />
    </AssignPaysheetUiProvider>
  );
}
