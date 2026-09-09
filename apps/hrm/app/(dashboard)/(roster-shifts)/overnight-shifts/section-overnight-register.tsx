'use client';

import { Suspense } from 'react';
import { Info } from 'lucide-react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { formatOvernightHours, formatOvernightMoney } from '@/lib/utils/overnight-shift';
import type { OvernightShiftRecord } from '@/types/roster';
import { overnightShiftColumns } from './columns';

type SectionOvernightRegisterProps = {
  items: OvernightShiftRecord[];
  totalRecords: number;
  page?: string;
  onExport: () => Promise<{ success: boolean; data?: Record<string, unknown>[]; message?: string }>;
};

export default function SectionOvernightRegister({
  items,
  totalRecords,
  page,
  onExport
}: SectionOvernightRegisterProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading overnight shifts...
        </div>
      }
    >
      <CommonDataTable
        heading="Overnight Shift Register"
        columns={overnightShiftColumns}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete={false}
        toolbarLeft={
          <div className="flex max-w-xl items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Hours are split at midnight; attendance is posted to the
              allocation date shown.
            </span>
          </div>
        }
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'Staff ID',
              'Staff Name',
              'Department',
              'Unit',
              'Start Date',
              'End Date',
              'Start Time',
              'End Time',
              'Day 1 Hours',
              'Day 2 Hours',
              'Total Hours',
              'Attendance Date',
              'Overnight OT',
              'Allowance',
              'Payroll Ready',
              'Status',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'staffCode',
              'staffName',
              'department',
              'unit',
              'startDate',
              'endDate',
              'startTime',
              'endTime',
              'day1Hours',
              'day2Hours',
              'totalHours',
              'attendanceDate',
              'overnightOt',
              'allowance',
              'payrollReady',
              'status',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Overnight Shifts"
            fileName="overnight-shifts"
          />
        }
      />
    </Suspense>
  );
}
