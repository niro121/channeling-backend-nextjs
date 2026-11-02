'use client';

import { Suspense, useEffect } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { useManageRosterUi } from './manage-roster-ui-context';
import { staffRosterColumns } from './staff-roster-columns';

function SelectionSync() {
  const { rowSelection, table } = useCommonDataTableContext();
  const { setSelectedStaffIds } = useManageRosterUi();

  useEffect(() => {
    const selectedKeys = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    const ids = selectedKeys.map(
      (key) => table.getRow(key).original.id as string
    );
    setSelectedStaffIds(ids);
  }, [rowSelection, setSelectedStaffIds, table]);

  return null;
}

function RegisterToolbarLeft() {
  const { selectedStaffIds, staffRosterRows, staffRosterLoaded } =
    useManageRosterUi();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectionSync />
      <span className="text-sm text-muted-foreground">
        {staffRosterLoaded
          ? `${selectedStaffIds.length} of ${staffRosterRows.length} selected`
          : 'Select a roster and click Load Staff'}
      </span>
      {staffRosterLoaded ? (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {staffRosterRows.length} staff
        </span>
      ) : null}
    </div>
  );
}

export default function SectionStaffRosterRegister() {
  const { staffRosterRows, staffRosterLoading, staffRosterLoaded } =
    useManageRosterUi();

  const handleExport = async () => ({
    success: true as const,
    data: staffRosterRows.map((row) => ({
      staffCode: row.staffCode,
      staffName: row.staffName,
      department: row.department,
      designation: row.designation,
      phone: row.phone,
      currentShift: row.currentShift,
      rosterName: row.rosterName,
      rosterCode: row.rosterCode,
      status: row.status
    }))
  });

  if (staffRosterLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading assigned staff...
      </div>
    );
  }

  if (!staffRosterLoaded) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-4 py-12 text-center">
        <p className="text-sm font-medium text-foreground">Staff Roster</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a roster group above, then click Load Staff to list members
          already registered on that group.
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading staff roster...
        </div>
      }
    >
      <CommonDataTable
        heading="Staff Roster"
        subHeading="Staff registered on the selected roster group (employment.roster membership)."
        columns={staffRosterColumns}
        data={staffRosterRows}
        rowCount={staffRosterRows.length}
        showPagination
        haveBulkDelete
        deleteServerAction={async () => false}
        toolbarLeft={<RegisterToolbarLeft />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[
              'Staff ID',
              'Staff Name',
              'Department',
              'Designation',
              'Phone',
              'Current Shift',
              'Roster',
              'Roster Code',
              'Status'
            ]}
            keys={[
              'staffCode',
              'staffName',
              'department',
              'designation',
              'phone',
              'currentShift',
              'rosterName',
              'rosterCode',
              'status'
            ]}
            title="Staff Roster Membership"
            fileName="staff-roster-membership"
          />
        }
      />
    </Suspense>
  );
}
