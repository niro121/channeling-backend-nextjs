'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { SalaryHistoryRecord } from '@/types/payroll';
import {
  SALARY_HISTORY_EXPORT_COLUMNS,
  SALARY_HISTORY_EXPORT_KEYS,
  salaryHistoryColumns
} from './columns';

type SectionRegisterProps = {
  records?: SalaryHistoryRecord[];
  totalRecords?: number;
  page?: string;
  staffFocusLabel?: string | null;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  staffFocusLabel = null
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

  const heading = staffFocusLabel
    ? staffFocusLabel
    : 'Salary History Records';
  const subHeading = staffFocusLabel
    ? 'Historical payroll entries for the selected staff member.'
    : 'Historical salary records across staff and periods.';

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading salary history...
        </div>
      }
    >
      <CommonDataTable
        heading={heading}
        subHeading={subHeading}
        columns={salaryHistoryColumns}
        data={records}
        rowCount={totalRecords}
        page={page}
        showPagination
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[...SALARY_HISTORY_EXPORT_COLUMNS]}
            keys={[...SALARY_HISTORY_EXPORT_KEYS]}
            title="Salary History"
            fileName="salary-history"
          />
        }
      />
    </Suspense>
  );
}
