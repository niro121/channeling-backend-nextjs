'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { AllowanceRecord, SalaryFilterOption } from '@/types/payroll';
import {
  ALLOWANCE_EXPORT_COLUMNS,
  ALLOWANCE_EXPORT_KEYS,
  allowanceColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: AllowanceRecord[];
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
            Loading allowances...
          </div>
        }
      >
        <CommonDataTable
          heading="Allowance Register"
          subHeading="Salary allowances with calculation method and applicability scope."
          columns={allowanceColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...ALLOWANCE_EXPORT_COLUMNS]}
              keys={[...ALLOWANCE_EXPORT_KEYS]}
              title="Allowances"
              fileName="allowances"
            />
          }
        />
      </Suspense>
    </div>
  );
}
