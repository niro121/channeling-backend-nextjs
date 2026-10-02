'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  deletePublicHolidayShiftAction,
  getPublicHolidayShiftsExportAction
} from '@/app/actions/roster-actions/public-holiday-shift.actions';
import type { PublicHolidayShiftRecord } from '@/types/roster';
import { holidayShiftColumns } from './columns';
import { usePublicHolidayShiftsUi } from './public-holiday-shifts-ui-context';

type SectionHolidayRegisterProps = {
  items: PublicHolidayShiftRecord[];
  totalCount: number;
};

function SelectionSync() {
  const { rowSelection } = useCommonDataTableContext();
  const { setSelectedCount } = usePublicHolidayShiftsUi();

  useEffect(() => {
    const count = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    ).length;
    setSelectedCount(count);
  }, [rowSelection, setSelectedCount]);

  return null;
}

function RegisterToolbarLeft({ totalCount }: { totalCount: number }) {
  const { selectedCount } = usePublicHolidayShiftsUi();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex max-w-xl items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Holidays are sourced from the Holiday Date master under HR
          Administration.
        </span>
      </div>
      <SelectionSync />
      <span className="text-sm text-muted-foreground">
        {selectedCount} of {totalCount} selected
      </span>
    </div>
  );
}

export default function SectionHolidayRegister({
  items,
  totalCount
}: SectionHolidayRegisterProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');
  const enableRowSelection = canEdit || canDelete;

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading public holiday shifts...
        </div>
      }
    >
      <CommonDataTable
        heading="Public Holiday Shift Register"
        subHeading="Staff rostered on gazetted holidays with holiday pay, lieu leave, and payroll posting."
        columns={holidayShiftColumns}
        data={items}
        rowCount={totalCount}
        showPagination
        haveBulkDelete={enableRowSelection}
        deleteServerAction={async (ids) => {
          let deleted = 0;
          for (const id of ids) {
            const result = await deletePublicHolidayShiftAction(id);
            if (!result.isError) deleted += 1;
          }
          if (deleted > 0) {
            toast({
              title: `${deleted} holiday shift${deleted === 1 ? '' : 's'} deleted`
            });
            router.refresh();
          }
          if (deleted < ids.length) {
            throw new Error(
              `${ids.length - deleted} record(s) could not be deleted.`
            );
          }
          return true;
        }}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} holiday shift${ids.length === 1 ? '' : 's'}.`
        }
        toolbarLeft={<RegisterToolbarLeft totalCount={totalCount} />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={async () => {
              const result = await getPublicHolidayShiftsExportAction({});
              if (!result.success) {
                return { success: false, data: [] };
              }
              return { success: true, data: result.data ?? [] };
            }}
            columns={[
              'Staff ID',
              'Staff Name',
              'Department',
              'Unit',
              'Holiday',
              'Holiday Type',
              'Duty Date',
              'Shift',
              'Worked Hours',
              'Pay Rate',
              'Holiday Allowance',
              'Duty Location',
              'Lieu Leave',
              'Send to Payroll',
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
              'holidayName',
              'holidayType',
              'dutyDate',
              'shiftLabel',
              'workedHours',
              'payRate',
              'holidayAllowance',
              'dutyLocation',
              'lieuLeave',
              'sendToPayroll',
              'status',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Public Holiday Shifts"
            fileName="public-holiday-shifts"
          />
        }
      />
    </Suspense>
  );
}
