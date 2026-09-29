'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_ALLOWANCE_SUMMARY,
  PAYROLL_WORKFLOW_STEPS,
  type AllowanceRecord
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

function AllowancesWorkspaceInner() {
  const { formSheet, closeFormSheet } = useAllowancesUi();
  const [records] = useState<AllowanceRecord[]>([]);
  const summary = EMPTY_ALLOWANCE_SUMMARY;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Allowances"
        description="Define salary allowances, calculation methods and applicability by category, department and designation."
        actions={<AllowancesHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={records}
        totalRecords={records.length}
        departmentOptions={[]}
        designationOptions={[]}
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

export default function AllowancesWorkspace() {
  return (
    <AllowancesUiProvider>
      <AllowancesWorkspaceInner />
    </AllowancesUiProvider>
  );
}
