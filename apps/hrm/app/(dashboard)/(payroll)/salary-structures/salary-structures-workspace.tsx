'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  DEPARTMENT_OPTIONS,
  STAFF_DESIGNATION_OPTIONS
} from '@/types/staff-employment-options';
import {
  PAYROLL_WORKFLOW_STEPS,
  type SalaryFilterOption,
  type SalaryStructureRecord,
  type SalaryStructureSummary
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import { SalaryStructuresHeaderActions } from './header-actions';
import {
  SalaryStructuresUiProvider,
  useSalaryStructuresUi
} from './salary-structures-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetStructureForm from './sheet-structure-form';

type SalaryStructuresWorkspaceProps = {
  initialRecords: SalaryStructureRecord[];
  totalRecords: number;
  summary: SalaryStructureSummary;
  structureOptions: SalaryFilterOption[];
  componentOptions: PaysheetComponentOption[];
  page?: string;
};

function SalaryStructuresWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  structureOptions,
  componentOptions,
  page
}: SalaryStructuresWorkspaceProps) {
  const { formSheet, closeFormSheet } = useSalaryStructuresUi();

  const departmentOptions: SalaryFilterOption[] = DEPARTMENT_OPTIONS.map(
    (item) => ({ id: item.id, name: item.name })
  );
  const designationOptions: SalaryFilterOption[] = STAFF_DESIGNATION_OPTIONS.map(
    (item) => ({ id: item.id, name: item.name })
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Salary Structures"
        description="Define grade and role salary templates with default allowances and deductions."
        actions={<SalaryStructuresHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        structureOptions={structureOptions}
      />

      <SheetStructureForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        componentOptions={componentOptions}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />
    </div>
  );
}

export default function SalaryStructuresWorkspace(
  props: SalaryStructuresWorkspaceProps
) {
  return (
    <SalaryStructuresUiProvider>
      <SalaryStructuresWorkspaceInner {...props} />
    </SalaryStructuresUiProvider>
  );
}
