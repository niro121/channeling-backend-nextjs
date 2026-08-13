'use client';

import { Suspense, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import { assignmentColumns } from './columns';
import type { ShiftAssignmentSample } from './sample-data';
import { useShiftAssignmentUi } from './shift-assignment-ui-context';

type SectionAssignmentRegisterProps = {
  items: ShiftAssignmentSample[];
};

const LATER = 'Will be wired in a later phase.';

function SelectionSync() {
  const { rowSelection } = useCommonDataTableContext();
  const { setSelectedCount } = useShiftAssignmentUi();

  useEffect(() => {
    const count = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    ).length;
    setSelectedCount(count);
  }, [rowSelection, setSelectedCount]);

  return null;
}

function RegisterToolbarLeft({ totalCount }: { totalCount: number }) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { selectedCount } = useShiftAssignmentUi();
  const canEdit = has('shift-roster', 'edit');

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() =>
            toast({ title: 'Auto Assign All', description: LATER })
          }
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto Assign All
        </Button>
      ) : null}
      <SelectionSync />
      <span className="text-sm text-muted-foreground">
        {selectedCount} of {totalCount} selected
      </span>
    </div>
  );
}

export default function SectionAssignmentRegister({
  items
}: SectionAssignmentRegisterProps) {
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');
  const enableRowSelection = canEdit || canDelete;

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading shift assignments...
        </div>
      }
    >
      <CommonDataTable
        heading="Shift Assignment Register"
        subHeading="Staff linked to shift types for duty and roster planning."
        columns={assignmentColumns}
        data={items}
        rowCount={items.length}
        showPagination
        haveBulkDelete={enableRowSelection}
        deleteServerAction={async (ids) => {
          throw new Error(
            `${ids.length} assignment${ids.length === 1 ? '' : 's'} selected. Bulk delete will be wired in a later phase.`
          );
        }}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} assignment${ids.length === 1 ? '' : 's'}. Saving is wired in a later phase.`
        }
        toolbarLeft={<RegisterToolbarLeft totalCount={items.length} />}
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
                designation: row.designation,
                assignedShift: row.assignedShift,
                effectiveFrom: row.effectiveFrom,
                effectiveTo: row.effectiveTo ?? '',
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
              'Designation',
              'Assigned Shift',
              'Effective From',
              'Effective To',
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
              'designation',
              'assignedShift',
              'effectiveFrom',
              'effectiveTo',
              'status',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Shift Assignments"
            fileName="shift-assignments"
          />
        }
      />
    </Suspense>
  );
}
