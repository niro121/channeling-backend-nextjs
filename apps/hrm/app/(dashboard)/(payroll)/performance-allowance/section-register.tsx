'use client';

import { Suspense, useMemo } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  PerformanceAllowanceMode,
  PerformanceAllowanceRecord
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
};

export default function SectionRegister({
  mode,
  records = [],
  totalRecords = 0,
  page
}: SectionRegisterProps) {
  const { toast } = useToast();
  const columns = useMemo(
    () => buildPerformanceAllowanceColumns(mode),
    [mode]
  );

  const heading =
    mode === 'percentage'
      ? 'Percentage Allowances Register'
      : 'Fixed Allowances Register';

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
      <SectionFilters />

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
