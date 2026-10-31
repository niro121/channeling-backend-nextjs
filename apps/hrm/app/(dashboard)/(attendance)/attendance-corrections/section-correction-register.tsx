'use client';

import { Suspense, useEffect } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { AttendanceCorrectionRecord } from '@/types/attendance';
import { correctionColumns } from './columns';
import { useAttendanceCorrectionsUi } from './attendance-corrections-ui-context';

type SectionCorrectionRegisterProps = {
  items: AttendanceCorrectionRecord[];
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
  const { setSelectedRecords } = useAttendanceCorrectionsUi();

  useEffect(() => {
    const selected = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => table.getRow(key).original as AttendanceCorrectionRecord);
    setSelectedRecords(selected);
  }, [rowSelection, setSelectedRecords, table]);

  return null;
}

function RegisterToolbarLeft({ totalCount }: { totalCount: number }) {
  const { selectedRecords } = useAttendanceCorrectionsUi();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectionSync />
      <span className="text-sm text-muted-foreground">
        {selectedRecords.length} of {totalCount} selected
      </span>
    </div>
  );
}

export default function SectionCorrectionRegister({
  items,
  totalRecords,
  page,
  onExport
}: SectionCorrectionRegisterProps) {
  const { has } = usePermissions();
  const canEdit = has('attendance', 'edit');
  const canDelete = has('attendance', 'delete');
  const enableRowSelection = canEdit || canDelete;

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading corrections...
        </div>
      }
    >
      <CommonDataTable
        heading="Correction Register"
        subHeading="Approved corrections update Daily Attendance. RFID punches stay immutable."
        columns={correctionColumns}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete={enableRowSelection}
        toolbarLeft={<RegisterToolbarLeft totalCount={totalRecords} />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'Correction No',
              'Staff ID',
              'Staff Name',
              'Department',
              'Designation',
              'Date',
              'Original In',
              'Original Out',
              'Original Status',
              'Corrected In',
              'Corrected Out',
              'Corrected Status',
              'Reason',
              'Status',
              'Requested By',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'correctionNo',
              'staffCode',
              'staffName',
              'department',
              'designation',
              'date',
              'originalIn',
              'originalOut',
              'originalStatus',
              'correctedIn',
              'correctedOut',
              'correctedStatus',
              'reason',
              'status',
              'requestedBy',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Attendance Corrections"
            fileName="attendance-corrections"
          />
        }
      />
    </Suspense>
  );
}
