'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  LoanAdvanceRecord,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import {
  LOAN_ADVANCE_EXPORT_COLUMNS,
  LOAN_ADVANCE_EXPORT_KEYS,
  loanAdvanceColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: LoanAdvanceRecord[];
  totalRecords?: number;
  page?: string;
  componentOptions?: PaysheetComponentOption[];
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  componentOptions = [],
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = []
}: SectionRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    toast({
      title: 'Export',
      description: 'Will be wired in the dynamic phase.'
    });
    return {
      success: false,
      message: 'Export will be wired in the dynamic phase.'
    };
  };

  return (
    <div className="space-y-4">
      <SectionFilters
        componentOptions={componentOptions}
        staffOptions={staffOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        rosterOptions={rosterOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading loans & advances...
          </div>
        }
      >
        <CommonDataTable
          heading="Loan And Advances"
          subHeading="Staff loans and salary advances with installments and outstanding balances."
          columns={loanAdvanceColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...LOAN_ADVANCE_EXPORT_COLUMNS]}
              keys={[...LOAN_ADVANCE_EXPORT_KEYS]}
              title="Loans & Advances"
              fileName="loans-advances"
            />
          }
        />
      </Suspense>
    </div>
  );
}
