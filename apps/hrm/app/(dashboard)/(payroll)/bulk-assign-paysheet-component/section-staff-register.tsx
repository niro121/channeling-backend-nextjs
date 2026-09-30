'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { BulkPaysheetStaffRow } from '@/types/payroll';
import {
  BULK_STAFF_EXPORT_COLUMNS,
  BULK_STAFF_EXPORT_KEYS,
  bulkStaffColumns
} from './staff-columns';
import { StaffSelectionToolbar } from './staff-selection-toolbar';

type SectionStaffRegisterProps = {
  records?: BulkPaysheetStaffRow[];
  totalRecords?: number;
  page?: string;
};

export default function SectionStaffRegister({
  records = [],
  totalRecords = 0,
  page
}: SectionStaffRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    if (!records.length) {
      toast({
        title: 'Export',
        description: 'No staff matches to export. Select an institution and search first.'
      });
      return { success: false, message: 'No staff matches found' };
    }
    return {
      success: true,
      data: records.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        institution: row.institution,
        designation: row.designation,
        staffCategory: row.staffCategory,
        grade: row.grade,
        roster: row.roster
      }))
    };
  };

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading staff matches...
        </div>
      }
    >
      <CommonDataTable
        heading="Staff Matching Filters"
        subHeading="Institution is required. Search, then select staff on the current page."
        columns={bulkStaffColumns}
        data={records}
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete
        toolbarLeft={<StaffSelectionToolbar totalMatches={totalRecords} />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[...BULK_STAFF_EXPORT_COLUMNS]}
            keys={[...BULK_STAFF_EXPORT_KEYS]}
            title="Bulk Assign Staff Matches"
            fileName="bulk-assign-paysheet-staff"
          />
        }
      />
    </Suspense>
  );
}
