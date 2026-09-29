'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_PAYSLIP_SUMMARY,
  PAYROLL_WORKFLOW_STEPS,
  type PayslipRecord
} from '@/types/payroll';
import { PayslipsHeaderActions } from './header-actions';
import { PayslipsUiProvider, usePayslipsUi } from './payslips-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetPayslipView from './sheet-payslip-view';

function PayslipsWorkspaceInner() {
  const { viewRecord, closeView } = usePayslipsUi();
  const [records] = useState<PayslipRecord[]>([]);
  const summary = EMPTY_PAYSLIP_SUMMARY;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Payslips"
        description="Search, view, download, print and email generated staff payslips."
        actions={<PayslipsHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={records}
        totalRecords={records.length}
        departmentOptions={[]}
        designationOptions={[]}
      />

      <SheetPayslipView
        open={viewRecord != null}
        record={viewRecord}
        onOpenChange={(open) => {
          if (!open) closeView();
        }}
      />
    </div>
  );
}

export default function PayslipsWorkspace() {
  return (
    <PayslipsUiProvider>
      <PayslipsWorkspaceInner />
    </PayslipsUiProvider>
  );
}
