'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Row } from '@tanstack/react-table';
import {
  Button,
  CustomAlertDialog,
  DataTableRowActions,
  useToast
} from '@archmage/ui';
import { Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteLeaveTypeAction } from '@/app/actions/leave-actions/leave-type.actions';
import type { LeaveTypeRecord } from '@/types/leave';

interface LeaveTypeRecordActionsProps {
  row: Row<LeaveTypeRecord>;
}

export default function LeaveTypeRecordActions({
  row
}: LeaveTypeRecordActionsProps) {
  const leaveType = row.original;
  const router = useRouter();
  const { has } = usePermissions();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteLeaveTypeAction(leaveType.id);

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.errors?.message ?? 'Leave type deletion unsuccessful.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave type deleted successfully.'
      });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Leave type deletion unsuccessful.'
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {has('leave-types', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/leave-types/${leaveType.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('leave-types', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete leave type?"
        description={`This will remove ${leaveType.name}. This action cannot be undone.`}
        handleContinue={onDelete}
      />
    </>
  );
}
