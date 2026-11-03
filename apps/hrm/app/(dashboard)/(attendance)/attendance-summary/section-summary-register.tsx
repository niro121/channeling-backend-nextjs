'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { AttendanceSummaryRow } from '@/types/attendance';
import { attendanceSummaryColumns } from './columns';

type SectionSummaryRegisterProps = {
  items: AttendanceSummaryRow[];
  totalRecords: number;
  page?: string;
  periodLabel: string;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function SectionSummaryRegister({
  items,
  totalRecords,
  page,
  periodLabel,
  onExport
}: SectionSummaryRegisterProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading attendance summary...
        </div>
      }
    >
      <CommonDataTable
        heading="Detailed Attendance Summary"
        subHeading={`${periodLabel} · Working-day totals include approved attendance corrections.`}
        columns={attendanceSummaryColumns}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton={false}
            serverData={onExport}
            columns={[
              'Staff Code',
              'Staff Name',
              'Department',
              'Working Days',
              'Present Days',
              'Absent Days',
              'Leave Days',
              'Holidays',
              'Days Off',
              'Late Count',
              'Early Out',
              'Overtime Hours',
              'Missing Punches',
              'Created By',
              'Created At',
              'Updated By',
              'Updated At'
            ]}
            keys={[
              'staffCode',
              'staffName',
              'department',
              'workingDays',
              'presentDays',
              'absentDays',
              'leaveDays',
              'holidays',
              'daysOff',
              'lateCount',
              'earlyOutCount',
              'overtimeHours',
              'missingPunches',
              'createdBy',
              'createdAt',
              'updatedBy',
              'updatedAt'
            ]}
            title="Attendance Summary"
            fileName="attendance-summary"
          />
        }
      />
    </Suspense>
  );
}
