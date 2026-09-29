'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_DEDUCTION_SUMMARY,
  PAYROLL_WORKFLOW_STEPS,
  type DeductionRecord
} from '@/types/payroll';
import {
  DeductionsUiProvider,
  useDeductionsUi
} from './deductions-ui-context';
import { DeductionsHeaderActions } from './header-actions';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetDeductionForm from './sheet-deduction-form';

function DeductionsWorkspaceInner() {
  const { formSheet, closeFormSheet } = useDeductionsUi();
  const [records] = useState<DeductionRecord[]>([]);
  const summary = EMPTY_DEDUCTION_SUMMARY;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Deductions"
        description="Configure statutory and payroll deductions consistent with existing EPF, ETF, PAYE, loan and no-pay rules."
        actions={<DeductionsHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={records}
        totalRecords={records.length}
        departmentOptions={[]}
        designationOptions={[]}
      />

      <SheetDeductionForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />
    </div>
  );
}

export default function DeductionsWorkspace() {
  return (
    <DeductionsUiProvider>
      <DeductionsWorkspaceInner />
    </DeductionsUiProvider>
  );
}
