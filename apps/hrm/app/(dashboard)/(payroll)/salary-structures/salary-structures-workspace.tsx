'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_SALARY_STRUCTURE_SUMMARY,
  SALARY_STRUCTURE_WORKFLOW_STEPS,
  type SalaryStructureRecord
} from '@/types/payroll';
import { SalaryStructuresHeaderActions } from './header-actions';
import {
  SalaryStructuresUiProvider,
  useSalaryStructuresUi
} from './salary-structures-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetStructureForm from './sheet-structure-form';

function SalaryStructuresWorkspaceInner() {
  const { formSheet, closeFormSheet } = useSalaryStructuresUi();
  const [records] = useState<SalaryStructureRecord[]>([]);
  const summary = EMPTY_SALARY_STRUCTURE_SUMMARY;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Salary Structures"
        description="Define grade and role salary templates with default allowances and deductions."
        actions={<SalaryStructuresHeaderActions />}
      />

      <SectionWorkflowSteps steps={SALARY_STRUCTURE_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={records}
        totalRecords={records.length}
        departmentOptions={[]}
        designationOptions={[]}
        structureOptions={[]}
      />

      <SheetStructureForm
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

export default function SalaryStructuresWorkspace() {
  return (
    <SalaryStructuresUiProvider>
      <SalaryStructuresWorkspaceInner />
    </SalaryStructuresUiProvider>
  );
}
