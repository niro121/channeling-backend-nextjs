'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { DailyAttendanceRow } from '@/types/attendance';
import { dailyAttendanceColumns } from './columns';

type SectionDailyRegisterProps = {
  items: DailyAttendanceRow[];
  totalRecords: number;
  page?: string;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function SectionDailyRegister({
  items,
  totalRecords,
  page,
  onExport
}: SectionDailyRegisterProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading daily attendance...
        </div>
      }
    >
      <CommonDataTable
        heading="Daily Attendance Register"
        subHeading="Showing operational attendance from RFID, roster, leave and holiday sources."
        columns={dailyAttendanceColumns}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'Staff Code',
              'Staff Name',
              'Department',
              'Designation',
              'Date',
              'Scheduled Shift',
              'Shift Start',
              'Shift End',
              'Check In',
              'Check Out',
              'Total Hours',
              'Late',
              'Early Out',
              'Overtime',
              'Status',
              'Source',
              'Remarks'
            ]}
            keys={[
              'staffCode',
              'staffName',
              'department',
              'designation',
              'date',
              'scheduledShift',
              'shiftStart',
              'shiftEnd',
              'checkIn',
              'checkOut',
              'totalHours',
              'late',
              'earlyOut',
              'overtime',
              'status',
              'source',
              'remarks'
            ]}
            title="Daily Attendance"
            fileName="daily-attendance"
          />
        }
      />
    </Suspense>
  );
}
