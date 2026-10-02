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
import { deleteLeaveEntitlementAction } from '@/app/actions/leave-actions/leave-entitlement.actions';
import type { LeaveEntitlementRecord } from '@/types/leave';

interface LeaveEntitlementRecordActionsProps {
  row: Row<LeaveEntitlementRecord>;
  onEdit?: (record: LeaveEntitlementRecord) => void;
  onDeleted?: () => void;
}

export default function LeaveEntitlementRecordActions({
  row,
  onEdit,
  onDeleted
}: LeaveEntitlementRecordActionsProps) {
  const record = row.original;
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteLeaveEntitlementAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.errors?.message ?? 'Leave entitlement deletion unsuccessful.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave entitlement deleted successfully.'
      });
      onDeleted?.();
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.message ?? 'Leave entitlement deletion unsuccessful.'
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="flex justify-end">
      <DataTableRowActions>
        {has('leave-entitlement', 'edit') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 cursor-pointer p-0"
            onClick={() => onEdit?.(record)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('leave-entitlement', 'delete') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 cursor-pointer p-0 text-destructive hover:text-destructive"
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
        title="Delete leave entitlement?"
        description={`This will remove the entitlement for ${record.leaveTypeName ?? 'this leave type'}.`}
        handleContinue={onDelete}
      />
    </div>
  );
}
