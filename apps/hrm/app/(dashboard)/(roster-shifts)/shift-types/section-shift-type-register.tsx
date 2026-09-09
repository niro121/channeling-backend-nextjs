'use client';

import { Suspense } from 'react';
import { Copy, Zap } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { useRouter } from 'next/navigation';
import {
  CommonDataTable,
  DataTableBulkDeleteFeature,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  bulkActivateShiftTypesAction,
  bulkDeleteShiftTypesAction
} from '@/app/actions/roster-actions/shift-type.actions';
import type { ShiftTypeRecord } from '@/types/roster';
import { shiftTypeColumns } from './columns';
import { useShiftTypesUi } from './shift-types-ui-context';

type SectionShiftTypeRegisterProps = {
  items: ShiftTypeRecord[];
  totalRecords: number;
  page?: string;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function RegisterToolbarLeft() {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openDuplicate } = useShiftTypesUi();
  const { table, rowSelection } = useCommonDataTableContext();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  const selectedRecords = () => {
    const selectedKeys = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    return selectedKeys.map(
      (key) => table.getRow(key).original as ShiftTypeRecord
    );
  };

  const handleDuplicate = () => {
    const selected = selectedRecords();
    if (selected.length !== 1) {
      toast({
        title: 'Select one shift type',
        description:
          'Select exactly one row in the register, then click Duplicate Shift.'
      });
      return;
    }
    openDuplicate(selected[0]);
  };

  const handleBulkActivate = async () => {
    const selected = selectedRecords();
    if (selected.length === 0) {
      toast({
        title: 'Select shift types',
        description: 'Select one or more rows, then click Bulk Activate.'
      });
      return;
    }

    const result = await bulkActivateShiftTypesAction(
      selected.map((row) => row.id)
    );
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not activate shift types.'
      });
      return;
    }

    toast({
      variant: 'success',
      title: 'Success',
      description: `${result.data?.count ?? selected.length} shift type(s) activated.`
    });
    router.refresh();
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
            onClick={() => {
              void handleBulkActivate();
            }}
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
  items,
  totalRecords,
  page,
  onExport
}: SectionShiftTypeRegisterProps) {
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');
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
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete={enableRowSelection}
        deleteServerAction={bulkDeleteShiftTypesAction}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} shift type${ids.length === 1 ? '' : 's'}. Types used by assignments or allocations cannot be deleted.`
        }
        toolbarLeft={<RegisterToolbarLeft />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
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
