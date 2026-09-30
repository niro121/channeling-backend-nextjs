'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  PAYROLL_WORKFLOW_STEPS,
  type DeductionFilters,
  type DeductionRecord,
  type DeductionSummary
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

type DeductionsWorkspaceProps = {
  initialRecords: DeductionRecord[];
  totalRecords: number;
  summary: DeductionSummary;
  page?: string;
  initialFilters?: DeductionFilters;
};

function DeductionsWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: DeductionsWorkspaceProps) {
  const { formSheet, closeFormSheet } = useDeductionsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Deductions"
        description="Payroll view of deduction paysheet components (fixed, loan, advance). Same catalog as HR Admin → Paysheet Components."
        actions={<DeductionsHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        initialFilters={initialFilters}
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

export default function DeductionsWorkspace(props: DeductionsWorkspaceProps) {
  return (
    <DeductionsUiProvider>
      <DeductionsWorkspaceInner {...props} />
    </DeductionsUiProvider>
  );
}
