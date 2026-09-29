'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { DeductionRecord, SalaryFilterOption } from '@/types/payroll';
import {
  DEDUCTION_EXPORT_COLUMNS,
  DEDUCTION_EXPORT_KEYS,
  deductionColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: DeductionRecord[];
  totalRecords?: number;
  page?: string;
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  departmentOptions = [],
  designationOptions = []
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
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading deductions...
          </div>
        }
      >
        <CommonDataTable
          heading="Deduction Register"
          subHeading="Statutory and payroll deductions with calculation method and applicability scope."
          columns={deductionColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...DEDUCTION_EXPORT_COLUMNS]}
              keys={[...DEDUCTION_EXPORT_KEYS]}
              title="Deductions"
              fileName="deductions"
            />
          }
        />
      </Suspense>
    </div>
  );
}
