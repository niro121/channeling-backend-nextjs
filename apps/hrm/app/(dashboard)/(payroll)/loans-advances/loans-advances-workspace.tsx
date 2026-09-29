'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_LOAN_ADVANCE_SUMMARY,
  type LoanAdvanceRecord
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
  componentOptions?: PaysheetComponentOption[];
};

function LoansAdvancesWorkspaceInner({
  componentOptions = []
}: LoansAdvancesWorkspaceProps) {
  const { viewRecord, closeView } = useLoansAdvancesUi();
  const [records] = useState<LoanAdvanceRecord[]>([]);
  const summary = EMPTY_LOAN_ADVANCE_SUMMARY;

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
          staffOptions={[]}
        />
        <SectionRegister
          records={records}
          totalRecords={records.length}
          componentOptions={componentOptions}
          staffOptions={[]}
          departmentOptions={[]}
          designationOptions={[]}
          rosterOptions={[]}
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

export default function LoansAdvancesWorkspace({
  componentOptions = []
}: LoansAdvancesWorkspaceProps) {
  return (
    <LoansAdvancesUiProvider>
      <LoansAdvancesWorkspaceInner componentOptions={componentOptions} />
    </LoansAdvancesUiProvider>
  );
}
