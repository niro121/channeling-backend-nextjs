'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  PAYROLL_WORKFLOW_STEPS,
  type AllowanceFilters,
  type AllowanceRecord,
  type AllowanceSummary
} from '@/types/payroll';
import {
  AllowancesUiProvider,
  useAllowancesUi
} from './allowances-ui-context';
import { AllowancesHeaderActions } from './header-actions';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetAllowanceForm from './sheet-allowance-form';

type AllowancesWorkspaceProps = {
  initialRecords: AllowanceRecord[];
  totalRecords: number;
  summary: AllowanceSummary;
  page?: string;
  initialFilters?: AllowanceFilters;
};

function AllowancesWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: AllowancesWorkspaceProps) {
  const { formSheet, closeFormSheet } = useAllowancesUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Allowances"
        description="Payroll view of allowance paysheet components (fixed and percentage). Same catalog as HR Admin → Paysheet Components."
        actions={<AllowancesHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        initialFilters={initialFilters}
      />

      <SheetAllowanceForm
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

export default function AllowancesWorkspace(props: AllowancesWorkspaceProps) {
  return (
    <AllowancesUiProvider>
      <AllowancesWorkspaceInner {...props} />
    </AllowancesUiProvider>
  );
}
