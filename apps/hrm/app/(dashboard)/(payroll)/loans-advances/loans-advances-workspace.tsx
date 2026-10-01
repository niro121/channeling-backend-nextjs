'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  type LoanAdvanceFilters,
  type LoanAdvanceRecord,
  type LoanAdvanceSummary,
  type PaysheetStaffOption,
  type SalaryFilterOption
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import {
  LoansAdvancesUiProvider,
  useLoansAdvancesUi
} from './loans-advances-ui-context';
import DialogLoanView from './dialog-loan-view';
import SectionLoanDetail from './section-loan-detail';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';

type LoansAdvancesWorkspaceProps = {
  initialRecords: LoanAdvanceRecord[];
  totalRecords: number;
  summary: LoanAdvanceSummary;
  page?: string;
  componentOptions?: PaysheetComponentOption[];
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
  initialFilters?: LoanAdvanceFilters;
};

function LoansAdvancesWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  componentOptions = [],
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = [],
  initialFilters
}: LoansAdvancesWorkspaceProps) {
  const { viewRecord, closeView } = useLoansAdvancesUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Loans & Advances"
        description="Manage staff loans, salary advances, monthly installments and outstanding balances."
      />

      <SectionSummary summary={summary} />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
        <SectionLoanDetail
          componentOptions={componentOptions}
          staffOptions={staffOptions}
        />
        <SectionRegister
          records={initialRecords}
          totalRecords={totalRecords}
          page={page}
          componentOptions={componentOptions}
          staffOptions={staffOptions}
          departmentOptions={departmentOptions}
          designationOptions={designationOptions}
          rosterOptions={rosterOptions}
          initialFilters={initialFilters}
        />
      </div>

      <DialogLoanView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />
    </div>
  );
}

export default function LoansAdvancesWorkspace(
  props: LoansAdvancesWorkspaceProps
) {
  return (
    <LoansAdvancesUiProvider>
      <LoansAdvancesWorkspaceInner {...props} />
    </LoansAdvancesUiProvider>
  );
}
