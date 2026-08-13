'use client';

import { Suspense } from 'react';
import { Copy, Zap } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableBulkDeleteFeature,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import { shiftTypeColumns } from './columns';
import type { ShiftTypeSample } from './sample-data';
import { useShiftTypesUi } from './shift-types-ui-context';

type SectionShiftTypeRegisterProps = {
  items: ShiftTypeSample[];
};

const LATER = 'Will be wired in a later phase.';

function RegisterToolbarLeft() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openDuplicate } = useShiftTypesUi();
  const { table, rowSelection } = useCommonDataTableContext();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  const handleDuplicate = () => {
    const selectedKeys = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    if (selectedKeys.length !== 1) {
      toast({
        title: 'Select one shift type',
        description:
          'Select exactly one row in the register, then click Duplicate Shift.'
      });
      return;
    }
    const row = table.getRow(selectedKeys[0]).original as ShiftTypeSample;
    openDuplicate(row);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={handleDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate Shift
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() =>
              toast({ title: 'Bulk Activate', description: LATER })
            }
          >
            <Zap className="h-3.5 w-3.5" />
            Bulk Activate
          </Button>
        </>
      ) : null}
      {canDelete ? <DataTableBulkDeleteFeature /> : null}
    </div>
  );
}

export default function SectionShiftTypeRegister({
  items
}: SectionShiftTypeRegisterProps) {
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');
  // Selection powers Duplicate (edit) and Bulk Delete — enable when either applies.
  const enableRowSelection = canEdit || canDelete;

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading shift types...
        </div>
      }
    >
      <CommonDataTable
        heading="Shift Type Register"
        subHeading="Master shift definitions available for roster allocation."
        columns={shiftTypeColumns}
        data={items}
        rowCount={items.length}
        showPagination
        haveBulkDelete={enableRowSelection}
        deleteServerAction={async (ids) => {
          throw new Error(
            `${ids.length} shift type${ids.length === 1 ? '' : 's'} selected. Bulk delete will be wired in a later phase.`
          );
        }}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} shift type${ids.length === 1 ? '' : 's'}. Saving is wired in a later phase.`
        }
        toolbarLeft={<RegisterToolbarLeft />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={async () => ({
              success: true,
              data: items.map((row) => ({
                code: row.code,
                name: row.name,
                category: row.category,
                startTime: row.startTime,
                endTime: row.endTime,
                durationHours: row.durationHours,
                nightShift: row.isNightShift ? 'Yes' : 'No',
                overnight: row.isOvernight ? 'Yes' : 'No',
                holidayEligible: row.holidayEligible ? 'Yes' : 'No',
                status: row.status,
                updatedBy: row.updatedBy,
                updatedAt: row.updatedAt,
                createdBy: row.createdBy,
                createdAt: row.createdAt
              }))
            })}
            columns={[
              'Shift Code',
              'Shift Name',
              'Category',
              'Start Time',
              'End Time',
              'Duration',
              'Night Shift',
              'Overnight',
              'Holiday Eligible',
              'Status',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'code',
              'name',
              'category',
              'startTime',
              'endTime',
              'durationHours',
              'nightShift',
              'overnight',
              'holidayEligible',
              'status',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Shift Types"
            fileName="shift-types"
          />
        }
      />
    </Suspense>
  );
}
