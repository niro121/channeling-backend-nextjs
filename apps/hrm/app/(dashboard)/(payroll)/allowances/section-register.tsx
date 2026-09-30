'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import { exportAllowancesAction } from '@/app/actions/payroll-actions/allowance.actions';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { AllowanceFilters, AllowanceRecord } from '@/types/payroll';
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
  initialFilters?: AllowanceFilters;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {}
}: SectionRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    const result = await exportAllowancesAction(initialFilters);
    if (!result.success || !result.data?.length) {
      toast({
        title: 'Export',
        description: result.message ?? 'No allowances to export.'
      });
      return {
        success: false,
        message: result.message ?? 'No allowances found'
      };
    }
    return { success: true, data: result.data };
  };

  return (
    <div className="space-y-4">
      <SectionFilters initial={initialFilters} />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading allowances...
          </div>
        }
      >
        <CommonDataTable
          heading="Allowance Register"
          subHeading="Fixed and percentage allowance components from the paysheet catalog."
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
