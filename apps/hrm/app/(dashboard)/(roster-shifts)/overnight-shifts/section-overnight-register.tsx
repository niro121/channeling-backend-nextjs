'use client';

import { Suspense } from 'react';
import { Info } from 'lucide-react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { overnightShiftColumns } from './columns';
import {
  formatOvernightHours,
  formatOvernightMoney,
  type OvernightShiftSample
} from './sample-data';

type SectionOvernightRegisterProps = {
  items: OvernightShiftSample[];
};

export default function SectionOvernightRegister({
  items
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
        rowCount={items.length}
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
            serverData={async () => ({
              success: true,
              data: items.map((row) => ({
                staffCode: row.staffCode,
                staffName: row.staffName,
                department: row.department,
                unit: row.unit,
                shiftStart: `${row.shiftStart} ${row.startTime}`,
                shiftEnd: `${row.shiftEnd} ${row.endTime}`,
                day1Hours: formatOvernightHours(row.day1Hours),
                day2Hours: formatOvernightHours(row.day2Hours),
                totalHours: formatOvernightHours(row.totalHours),
                attendanceDate: row.attendanceDate,
                overnightOt: formatOvernightHours(row.overnightOt),
                allowance: formatOvernightMoney(row.allowance),
                payrollReady: row.payrollReady ? 'Yes' : 'No',
                status: row.status,
                updatedBy: row.updatedBy,
                updatedAt: row.updatedAt,
                createdBy: row.createdBy,
                createdAt: row.createdAt
              }))
            })}
            columns={[
              'Staff ID',
              'Staff Name',
              'Department',
              'Unit',
              'Shift Start',
              'Shift End',
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
              'shiftStart',
              'shiftEnd',
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
