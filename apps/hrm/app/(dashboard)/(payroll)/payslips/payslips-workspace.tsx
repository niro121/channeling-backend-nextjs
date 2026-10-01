'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  PAYROLL_WORKFLOW_STEPS,
  type PaysheetStaffOption,
  type PayslipFilters,
  type PayslipRecord,
  type PayslipSummary,
  type SalaryFilterOption
} from '@/types/payroll';
import { PayslipsHeaderActions } from './header-actions';
import { PayslipsUiProvider, usePayslipsUi } from './payslips-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetPayslipView from './sheet-payslip-view';

type PayslipsWorkspaceProps = {
  initialRecords: PayslipRecord[];
  totalRecords: number;
  summary: PayslipSummary;
  page?: string;
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  initialFilters?: PayslipFilters;
};

function PayslipsWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  initialFilters
}: PayslipsWorkspaceProps) {
  const { viewRecord, closeView } = usePayslipsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Payslips"
        description="Search, view, download, print, email and SMS generated staff payslips."
        actions={<PayslipsHeaderActions filters={initialFilters} />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        staffOptions={staffOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        initialFilters={initialFilters}
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

export default function PayslipsWorkspace(props: PayslipsWorkspaceProps) {
  return (
    <PayslipsUiProvider>
      <PayslipsWorkspaceInner {...props} />
    </PayslipsUiProvider>
  );
}
