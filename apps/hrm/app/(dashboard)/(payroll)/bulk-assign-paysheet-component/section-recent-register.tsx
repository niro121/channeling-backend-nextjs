'use client';

import { Suspense } from 'react';
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
  const handleExport = async () => {
    if (!records.length) {
      return { success: false, message: 'No recent assignments found' };
    }
    return {
      success: true,
      data: records.map((row) => ({
        institution: row.institution,
        department: row.department,
        staffName: row.staffName,
        staffCode: row.staffCode,
        componentName: row.componentName,
        value: String(row.value),
        effectiveFrom: row.effectiveFrom ?? '—',
        effectiveTo: row.effectiveTo ?? '—',
        status: row.status,
        createdBy: row.createdBy ?? '—',
        createdAt: row.createdAt ?? '—',
        updatedBy: row.updatedBy ?? '—',
        updatedAt: row.updatedAt ?? '—'
      }))
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
        subHeading="Latest paysheet assignments (includes this session)."
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
