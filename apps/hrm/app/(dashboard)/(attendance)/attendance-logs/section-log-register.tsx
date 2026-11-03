'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { AttendanceLogRecord } from '@/types/attendance';
import { attendanceLogColumns } from './columns';

type SectionLogRegisterProps = {
  items: AttendanceLogRecord[];
  totalRecords: number;
  page?: string;
  periodLabel: string;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function SectionLogRegister({
  items,
  totalRecords,
  page,
  periodLabel,
  onExport
}: SectionLogRegisterProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading attendance logs...
        </div>
      }
    >
      <CommonDataTable
        heading="Attendance Audit Log"
        subHeading={`${periodLabel} · Read-only records — audit entries cannot be edited or removed.`}
        columns={attendanceLogColumns}
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
              'Log ID',
              'Date',
              'Time',
              'Staff Code',
              'Staff Name',
              'Attendance Date',
              'Action',
              'Previous Value',
              'New Value',
              'Source',
              'Performed By',
              'Remarks',
              'Status',
              'Created By',
              'Created At',
              'Updated By',
              'Updated At'
            ]}
            keys={[
              'logCode',
              'date',
              'time',
              'staffCode',
              'staffName',
              'attendanceDate',
              'action',
              'previousValue',
              'newValue',
              'source',
              'performedBy',
              'remarks',
              'status',
              'createdBy',
              'createdAt',
              'updatedBy',
              'updatedAt'
            ]}
            title="Attendance Audit Log"
            fileName="attendance-logs"
          />
        }
      />
    </Suspense>
  );
}
