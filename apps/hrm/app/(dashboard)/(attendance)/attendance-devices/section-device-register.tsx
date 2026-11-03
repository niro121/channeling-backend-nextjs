'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableBulkDeleteFeature,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  bulkActivateAttendanceDevicesAction,
  bulkDeleteAttendanceDevicesAction
} from '@/app/actions/attendance-actions/device.actions';
import type { AttendanceDeviceRecord } from '@/types/attendance';
import { attendanceDeviceColumns } from './columns';

type SectionDeviceRegisterProps = {
  items: AttendanceDeviceRecord[];
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
  const { table, rowSelection } = useCommonDataTableContext();
  const canEdit = has('attendance', 'edit');
  const canDelete = has('attendance', 'delete');

  const selectedRecords = () => {
    const selectedKeys = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    return selectedKeys.map(
      (key) => table.getRow(key).original as AttendanceDeviceRecord
    );
  };

  const handleBulkActivate = async () => {
    const selected = selectedRecords();
    if (selected.length === 0) {
      toast({
        title: 'Select devices',
        description: 'Select one or more rows, then click Bulk Activate.'
      });
      return;
    }

    const result = await bulkActivateAttendanceDevicesAction(
      selected.map((row) => row.id)
    );
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not activate devices.'
      });
      return;
    }

    toast({
      variant: 'success',
      title: 'Success',
      description: `${result.data?.count ?? selected.length} device(s) activated.`
    });
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
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
      ) : null}
      {canDelete ? <DataTableBulkDeleteFeature /> : null}
    </div>
  );
}

export default function SectionDeviceRegister({
  items,
  totalRecords,
  page,
  onExport
}: SectionDeviceRegisterProps) {
  const { has } = usePermissions();
  const canEdit = has('attendance', 'edit');
  const canDelete = has('attendance', 'delete');
  const enableRowSelection = canEdit || canDelete;

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading devices...
        </div>
      }
    >
      <CommonDataTable
        heading="Device Register"
        subHeading="RFID / finger-scan readers used for punch ingest. Devices with punches cannot be deleted."
        columns={attendanceDeviceColumns}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete={enableRowSelection}
        deleteServerAction={bulkDeleteAttendanceDevicesAction}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} device${ids.length === 1 ? '' : 's'}. Devices with existing punches cannot be deleted.`
        }
        toolbarLeft={<RegisterToolbarLeft />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'Device Code',
              'Device Name',
              'Location',
              'Status',
              'Last Seen',
              'API Key',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'code',
              'name',
              'location',
              'status',
              'lastSeenAt',
              'hasApiKey',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Attendance Devices"
            fileName="attendance-devices"
          />
        }
      />
    </Suspense>
  );
}
