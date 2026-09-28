'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { PaysheetAssignmentRecord } from '@/types/payroll';
import {
  RECENT_ASSIGNMENT_EXPORT_COLUMNS,
  RECENT_ASSIGNMENT_EXPORT_KEYS,
  recentAssignmentColumns
} from './recent-columns';

type SectionRecentRegisterProps = {
  records?: PaysheetAssignmentRecord[];
  totalRecords?: number;
  page?: string;
};

export default function SectionRecentRegister({
  records = [],
  totalRecords = 0,
  page
}: SectionRecentRegisterProps) {
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
          Loading recent assignments...
        </div>
      }
    >
      <CommonDataTable
        heading="Recently Assigned"
        subHeading="Assignments created in this bulk session (empty until dynamic phase)."
        columns={recentAssignmentColumns}
        data={records}
        rowCount={totalRecords}
        page={page}
        showPagination={false}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[...RECENT_ASSIGNMENT_EXPORT_COLUMNS]}
            keys={[...RECENT_ASSIGNMENT_EXPORT_KEYS]}
            title="Recently Assigned"
            fileName="bulk-assign-paysheet-recent"
          />
        }
      />
    </Suspense>
  );
}
