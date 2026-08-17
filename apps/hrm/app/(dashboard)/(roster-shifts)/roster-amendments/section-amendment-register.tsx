'use client';

import { Suspense, useEffect } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import { amendmentColumns } from './columns';
import type { RosterAmendmentSample } from './sample-data';
import { useRosterAmendmentsUi } from './roster-amendments-ui-context';

type SectionAmendmentRegisterProps = {
  items: RosterAmendmentSample[];
};

function SelectionSync({ items }: { items: RosterAmendmentSample[] }) {
  const { rowSelection } = useCommonDataTableContext();
  const { setSelectedRecords } = useRosterAmendmentsUi();

  useEffect(() => {
    const selected = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => items[Number(key)])
      .filter((row): row is RosterAmendmentSample => Boolean(row));
    setSelectedRecords(selected);
  }, [items, rowSelection, setSelectedRecords]);

  return null;
}

function RegisterToolbarLeft({
  items,
  totalCount
}: {
  items: RosterAmendmentSample[];
  totalCount: number;
}) {
  const { selectedRecords } = useRosterAmendmentsUi();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectionSync items={items} />
      <span className="text-sm text-muted-foreground">
        {selectedRecords.length} of {totalCount} selected
      </span>
    </div>
  );
}

export default function SectionAmendmentRegister({
  items
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
        rowCount={items.length}
        showPagination
        haveBulkDelete={enableRowSelection}
        deleteServerAction={async (ids) => {
          throw new Error(
            `${ids.length} amendment${ids.length === 1 ? '' : 's'} selected. Bulk delete will be wired in a later phase.`
          );
        }}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} amendment${ids.length === 1 ? '' : 's'}. Saving is wired in a later phase.`
        }
        toolbarLeft={
          <RegisterToolbarLeft items={items} totalCount={items.length} />
        }
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={async () => ({
              success: true,
              data: items.map((row) => ({
                amendmentNo: row.amendmentNo,
                staffCode: row.staffCode,
                staffName: row.staffName,
                rosterDate: row.rosterDate,
                originalShift: row.originalShift,
                amendedShift: row.amendedShift,
                amendmentType: row.amendmentType,
                reason: row.reason,
                requestedBy: row.requestedBy,
                status: row.status,
                updatedBy: row.updatedBy,
                updatedAt: row.updatedAt,
                createdBy: row.createdBy,
                createdAt: row.createdAt
              }))
            })}
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
