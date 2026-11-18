'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import { exportDeductionsAction } from '@/app/actions/payroll-actions/deduction.actions';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { DeductionFilters, DeductionRecord } from '@/types/payroll';
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
  initialFilters?: DeductionFilters;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {}
}: SectionRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    const result = await exportDeductionsAction(initialFilters);
    if (!result.success || !result.data?.length) {
      toast({
        title: 'Export',
        description: result.message ?? 'No deductions to export.'
      });
      return {
        success: false,
        message: result.message ?? 'No deductions found'
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
            Loading deductions...
          </div>
        }
      >
        <CommonDataTable
          heading="Deduction Register"
          subHeading="Fixed, loan, and advance deduction components from the paysheet catalog."
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
