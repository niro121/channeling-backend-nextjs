'use client';

import { Suspense, useMemo } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { getPerformanceAllowanceExportAction } from '@/app/actions/payroll-actions/performance-allowance.actions';
import type {
  PerformanceAllowanceFilters,
  PerformanceAllowanceMode,
  PerformanceAllowanceRecord,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';
import {
  PERFORMANCE_ALLOWANCE_EXPORT_COLUMNS,
  PERFORMANCE_ALLOWANCE_EXPORT_KEYS,
  buildPerformanceAllowanceColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  mode: PerformanceAllowanceMode;
  records?: PerformanceAllowanceRecord[];
  totalRecords?: number;
  page?: string;
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  initialFilters?: PerformanceAllowanceFilters;
};

export default function SectionRegister({
  mode,
  records = [],
  totalRecords = 0,
  page,
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  initialFilters
}: SectionRegisterProps) {
  const columns = useMemo(
    () => buildPerformanceAllowanceColumns(mode),
    [mode]
  );

  const heading =
    mode === 'percentage'
      ? 'Percentage Allowances Register'
      : 'Fixed Allowances Register';

  const handleExport = async () => {
    const result = await getPerformanceAllowanceExportAction({
      mode,
      staffId: initialFilters?.staffId,
      departmentId: initialFilters?.departmentId,
      designationId: initialFilters?.designationId,
      effectiveDate: initialFilters?.effectiveDate
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
            Loading register...
          </div>
        }
      >
        <CommonDataTable
          heading={heading}
          subHeading="Performance allowances for the selected mode."
          columns={columns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...PERFORMANCE_ALLOWANCE_EXPORT_COLUMNS]}
              keys={[...PERFORMANCE_ALLOWANCE_EXPORT_KEYS]}
              title={heading}
              fileName={`performance-allowance-${mode}`}
            />
          }
        />
      </Suspense>
    </div>
  );
}
