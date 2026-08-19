'use client';

import { Suspense, useEffect } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { RosterAmendmentRecord } from '@/types/roster';
import { amendmentColumns } from './columns';
import { useRosterAmendmentsUi } from './roster-amendments-ui-context';

type SectionAmendmentRegisterProps = {
  items: RosterAmendmentRecord[];
  totalRecords: number;
  page?: string;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function SelectionSync() {
  const { rowSelection, table } = useCommonDataTableContext();
  const { setSelectedRecords } = useRosterAmendmentsUi();

  useEffect(() => {
    const selected = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => table.getRow(key).original as RosterAmendmentRecord);
    setSelectedRecords(selected);
  }, [rowSelection, setSelectedRecords, table]);

  return null;
}

function RegisterToolbarLeft({ totalCount }: { totalCount: number }) {
  const { selectedRecords } = useRosterAmendmentsUi();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectionSync />
      <span className="text-sm text-muted-foreground">
        {selectedRecords.length} of {totalCount} selected
      </span>
    </div>
  );
}

export default function SectionAmendmentRegister({
  items,
  totalRecords,
  page,
  onExport
}: SectionAmendmentRegisterProps) {
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');
  const enableRowSelection = canEdit || canDelete;

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading roster amendments...
        </div>
      }
    >
      <CommonDataTable
        heading="Amendment Register"
        subHeading="Approved amendments are locked and can only be reversed by a new amendment."
        columns={amendmentColumns}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete={enableRowSelection}
        toolbarLeft={
          <RegisterToolbarLeft totalCount={totalRecords} />
        }
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'Amendment No',
              'Staff ID',
              'Staff Name',
              'Roster Date',
              'Original Shift',
              'Amended Shift',
              'Amendment Type',
              'Reason',
              'Requested By',
              'Approval Status',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'amendmentNo',
              'staffCode',
              'staffName',
              'rosterDate',
              'originalShift',
              'amendedShift',
              'amendmentType',
              'reason',
              'requestedBy',
              'status',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Roster Amendments"
            fileName="roster-amendments"
          />
        }
      />
    </Suspense>
  );
}
