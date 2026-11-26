'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { getPayslipExportAction } from '@/app/actions/payroll-actions/payslip.actions';
import type {
  PaysheetStaffOption,
  PayslipFilters,
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
  initialFilters?: PayslipFilters;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  initialFilters
}: SectionRegisterProps) {
  const handleExport = async () => {
    const result = await getPayslipExportAction({
      salaryMonth: initialFilters?.salaryMonth,
      salaryYear: initialFilters?.salaryYear,
      staffId: initialFilters?.staffId,
      staffCode: initialFilters?.staffCode,
      departmentId: initialFilters?.departmentId,
      designationId: initialFilters?.designationId,
      institution: initialFilters?.institution,
      paymentStatus: initialFilters?.paymentStatus
    });
    if (!result.success) {
      return {
        success: false,
        message: result.message ?? 'Export failed'
      };
    }
    return {
      success: true,
      data: result.data ?? []
    };
  };

  return (
    <div className="space-y-4">
      <SectionFilters
        staffOptions={staffOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        initial={initialFilters}
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
