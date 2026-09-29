'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  PaysheetStaffOption,
  PayslipRecord,
  SalaryFilterOption
} from '@/types/payroll';
import {
  PAYSLIP_EXPORT_COLUMNS,
  PAYSLIP_EXPORT_KEYS,
  payslipColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: PayslipRecord[];
  totalRecords?: number;
  page?: string;
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  staffOptions = [],
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
        staffOptions={staffOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading payslips...
          </div>
        }
      >
        <CommonDataTable
          heading="Payslip Register"
          subHeading="Generated staff payslips for the selected salary period."
          columns={payslipColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...PAYSLIP_EXPORT_COLUMNS]}
              keys={[...PAYSLIP_EXPORT_KEYS]}
              title="Payslips"
              fileName="payslips"
            />
          }
        />
      </Suspense>
    </div>
  );
}
