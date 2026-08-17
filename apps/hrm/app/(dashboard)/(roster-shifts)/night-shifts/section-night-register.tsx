'use client';

import { Suspense } from 'react';
import { Info } from 'lucide-react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { nightShiftColumns } from './columns';
import {
  CONSECUTIVE_NIGHT_LIMIT,
  formatNightHours,
  formatNightMoney,
  type NightShiftSample
} from './sample-data';

type SectionNightRegisterProps = {
  items: NightShiftSample[];
};

export default function SectionNightRegister({
  items
}: SectionNightRegisterProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading night shifts...
        </div>
      }
    >
      <CommonDataTable
        heading="Night Shift Register"
        columns={nightShiftColumns}
        data={items}
        rowCount={items.length}
        showPagination
        haveBulkDelete={false}
        toolbarLeft={
          <div className="flex max-w-xl items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Rows highlighted in the alerts column exceed the{' '}
              {CONSECUTIVE_NIGHT_LIMIT} consecutive night policy.
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
                shiftDate: row.shiftDate,
                nightShift: row.nightShift,
                nightHours: formatNightHours(row.nightHours),
                nightOt: formatNightHours(row.nightOt),
                nightAllowance: formatNightMoney(row.nightAllowance),
                mealAllowance: formatNightMoney(row.mealAllowance),
                consecutiveNights: row.consecutiveNights,
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
              'Shift Date',
              'Night Shift',
              'Night Hours',
              'Night OT',
              'Night Allowance',
              'Meal Allowance',
              'Consecutive Nights',
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
              'shiftDate',
              'nightShift',
              'nightHours',
              'nightOt',
              'nightAllowance',
              'mealAllowance',
              'consecutiveNights',
              'payrollReady',
              'status',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Night Shifts"
            fileName="night-shifts"
          />
        }
      />
    </Suspense>
  );
}
