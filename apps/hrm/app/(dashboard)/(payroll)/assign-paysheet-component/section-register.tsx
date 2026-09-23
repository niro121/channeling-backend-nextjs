'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { PaysheetAssignmentRecord } from '@/types/payroll';
import {
  ASSIGN_PAYSHEET_EXPORT_COLUMNS,
  ASSIGN_PAYSHEET_EXPORT_KEYS,
  assignPaysheetColumns
} from './columns';

type SectionRegisterProps = {
  records?: PaysheetAssignmentRecord[];
  totalRecords?: number;
  page?: string;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page
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
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading assignments...
        </div>
      }
    >
      <CommonDataTable
        heading="Assign Paysheet Component"
        subHeading="Staff paysheet component assignments with effective date ranges."
        columns={assignPaysheetColumns}
        data={records}
        rowCount={totalRecords}
        page={page}
        showPagination
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[...ASSIGN_PAYSHEET_EXPORT_COLUMNS]}
            keys={[...ASSIGN_PAYSHEET_EXPORT_KEYS]}
            title="Assign Paysheet Component"
            fileName="assign-paysheet-component"
          />
        }
      />
    </Suspense>
  );
}
