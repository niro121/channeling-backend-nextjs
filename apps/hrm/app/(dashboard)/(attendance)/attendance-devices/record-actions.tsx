'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteAttendanceDeviceAction } from '@/app/actions/attendance-actions/device.actions';
import type { AttendanceDeviceRecord } from '@/types/attendance';
import { useAttendanceDevicesUi } from './attendance-devices-ui-context';

type DeviceRecordActionsProps = {
  record: AttendanceDeviceRecord;
};

export default function DeviceRecordActions({
  record
}: DeviceRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit } = useAttendanceDevicesUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('attendance', 'edit');
  const canDelete = has('attendance', 'delete');

  const handleDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteAttendanceDeviceAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (result.errors as { message?: string })?.message ??
            'Device could not be deleted.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: `${record.name} (${record.code}) deleted.`
      });
      setOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Device could not be deleted.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${record.name}`}
            onClick={() => openEdit(record)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${record.name}`}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete device?"
        description={`This will remove ${record.name} (${record.code}). Devices with existing punches cannot be deleted — deactivate them instead.`}
        handleContinue={() => {
          void handleDelete();
        }}
        className={{
          actionButton:
            'bg-destructive text-destructive-foreground hover:bg-destructive/90'
        }}
      />
    </>
  );
}
