'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, startOfWeek } from 'date-fns';
import { Sparkles } from 'lucide-react';
import {
  Button,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  useToast
} from '@archmage/ui';
import {
  CommonDataTable,
  DataTableBulkDeleteFeature,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import { bulkDeleteShiftAssignmentsAction } from '@/app/actions/roster-actions/shift-assignment.actions';
import { autoAssignRosterDraftAction } from '@/app/actions/roster-actions/shift-roster.actions';
import type { ShiftAssignmentRecord } from '@/types/roster';
import DialogSoftWarnAck from '../dialog-soft-warn-ack';
import { assignmentColumns } from './columns';
import { useShiftAssignmentUi } from './shift-assignment-ui-context';

type SectionAssignmentRegisterProps = {
  items: ShiftAssignmentRecord[];
  totalRecords: number;
  page?: string;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function defaultWeekRange() {
  const ws = startOfWeek(new Date(), { weekStartsOn: 0 });
  return {
    fromDate: format(ws, 'yyyy-MM-dd'),
    toDate: format(addDays(ws, 6), 'yyyy-MM-dd')
  };
}

function SelectionSync() {
  const { rowSelection, table } = useCommonDataTableContext();
  const {
    setSelectedCount,
    setSelectedStaffIds,
    setSelectedAssignmentIds
  } = useShiftAssignmentUi();

  useEffect(() => {
    const selectedKeys = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    const rows = selectedKeys.map(
      (key) => table.getRow(key).original as ShiftAssignmentRecord
    );
    setSelectedCount(selectedKeys.length);
    setSelectedStaffIds([...new Set(rows.map((row) => row.staffId))]);
    setSelectedAssignmentIds(rows.map((row) => row.id));
  }, [
    rowSelection,
    setSelectedCount,
    setSelectedStaffIds,
    setSelectedAssignmentIds,
    table
  ]);

  return null;
}

function RegisterToolbarLeft({ totalCount }: { totalCount: number }) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { selectedCount, selectedAssignmentIds } = useShiftAssignmentUi();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');
  const defaults = defaultWeekRange();
  const [rangeOpen, setRangeOpen] = useState(false);
  const [fromDate, setFromDate] = useState(defaults.fromDate);
  const [toDate, setToDate] = useState(defaults.toDate);
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmWarnings, setConfirmWarnings] = useState<string[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const pendingAckRef = useRef(false);

  const runAutoAssign = async (
    acknowledgedWarnings = false,
    markLeaveOnApprovedLeave = false
  ) => {
    if (!selectedAssignmentIds.length) {
      toast({
        variant: 'destructive',
        title: 'Select assignments',
        description:
          'Select one or more Fixed Auto Assign rows, then try again.'
      });
      return;
    }
    if (!fromDate || !toDate) {
      toast({
        variant: 'destructive',
        title: 'Date range required',
        description: 'Choose from and to dates for auto-assign.'
      });
      return;
    }

    setRunning(true);
    try {
      const result = await autoAssignRosterDraftAction({
        fromDate,
        toDate,
        assignmentIds: selectedAssignmentIds,
        ...(acknowledgedWarnings ? { acknowledgedWarnings: true } : {}),
        ...(markLeaveOnApprovedLeave
          ? { markLeaveOnApprovedLeave: true }
          : {})
      });

      if (result.isError) {
        const errorMap = result.errors as Record<
          string,
          string | string[] | boolean | undefined
        >;
        if (errorMap.requiresAck) {
          const softWarnings = Array.isArray(errorMap.softWarnings)
            ? errorMap.softWarnings.filter(
                (item): item is string => typeof item === 'string'
              )
            : [];
          pendingAckRef.current = true;
          setConfirmWarnings(
            softWarnings.length
              ? softWarnings
              : [
                  typeof errorMap.message === 'string'
                    ? errorMap.message
                    : 'Leave or weekly off overlaps some days. Continue anyway?'
                ]
          );
          setConfirmOpen(true);
          return;
        }
        toast({
          variant: 'destructive',
          title: 'Auto Assign failed',
          description:
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : undefined) ?? 'Could not generate draft cells.'
        });
        return;
      }

      pendingAckRef.current = false;
      setRangeOpen(false);
      const created = Number(result.data?.created ?? 0);
      const skippedOccupied = Number(result.data?.skippedOccupied ?? 0);
      toast({
        variant: 'success',
        title: 'Auto Assign complete',
        description: `Created ${created} draft cell(s)${
          skippedOccupied
            ? `; skipped ${skippedOccupied} occupied day(s)`
            : ''
        }.`
      });
      router.refresh();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          disabled={selectedCount === 0}
          onClick={() => {
            const next = defaultWeekRange();
            setFromDate(next.fromDate);
            setToDate(next.toDate);
            setRangeOpen(true);
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto Assign All
        </Button>
      ) : null}
      {canDelete ? <DataTableBulkDeleteFeature /> : null}
      <SelectionSync />
      <span className="text-sm text-muted-foreground">
        {selectedCount} of {totalCount} selected
      </span>

      <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Auto Assign All</DialogTitle>
            <DialogDescription>
              Creates draft duties for{' '}
              <span className="font-semibold text-foreground">
                {selectedAssignmentIds.length} selected
              </span>{' '}
              standing assignment
              {selectedAssignmentIds.length === 1 ? '' : 's'} in the date range
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What will happen
              </p>
              <ul className="list-disc space-y-2 pl-4 text-foreground">
                <li>
                  Fills <span className="font-semibold">empty days only</span>{' '}
                  — existing cells are left unchanged.
                </li>
                <li>
                  Only <span className="font-semibold">active</span>,{' '}
                  <span className="font-semibold">Fixed</span>,{' '}
                  <span className="font-semibold">Auto Assign</span> rules in
                  the selection are used.
                </li>
                <li>
                  <span className="font-semibold">Leave days</span> — soft
                  warning + Continue if leave overlaps.
                </li>
                <li>
                  <span className="font-semibold">Weekly off days</span> — soft
                  warning + Continue if the day is weekly off.
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Date range
              </Label>
              <DateRangePicker
                from={fromDate || undefined}
                to={toDate || undefined}
                onChange={({ from, to }) => {
                  setFromDate(from ?? '');
                  setToDate(to ?? '');
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRangeOpen(false)}
              disabled={running}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={running}
              onClick={() => void runAutoAssign(false)}
            >
              {running ? 'Generating…' : 'Generate drafts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogSoftWarnAck
        open={confirmOpen}
        title="Leave / weekly off overlaps Auto Assign"
        warnings={confirmWarnings}
        loading={confirmLoading}
        allowMarkLeaveOnApproved
        onOpenChange={(next) => {
          if (!next) {
            pendingAckRef.current = false;
            setConfirmWarnings([]);
          }
          setConfirmOpen(next);
        }}
        onContinue={async ({ markLeaveOnApprovedLeave }) => {
          if (!pendingAckRef.current) {
            setConfirmOpen(false);
            return;
          }
          setConfirmLoading(true);
          setConfirmOpen(false);
          try {
            await runAutoAssign(true, markLeaveOnApprovedLeave);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </div>
  );
}

export default function SectionAssignmentRegister({
  items,
  totalRecords,
  page,
  onExport
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
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete={enableRowSelection}
        deleteServerAction={bulkDeleteShiftAssignmentsAction}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} shift assignment${ids.length === 1 ? '' : 's'}. This action cannot be undone.`
        }
        toolbarLeft={<RegisterToolbarLeft totalCount={totalRecords} />}
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
