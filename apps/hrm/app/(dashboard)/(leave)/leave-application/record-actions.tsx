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
import { Ban, Eye, Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  cancelLeaveApplicationAction,
  deleteLeaveApplicationAction
} from '@/app/actions/leave-actions/leave-application.actions';
import type { LeaveApplicationRecord } from '@/types/leave';
import { LeaveApplicationViewDialog } from './view-dialog';

interface LeaveApplicationRecordActionsProps {
  row: Row<LeaveApplicationRecord>;
  onEdit?: (record: LeaveApplicationRecord) => void;
  onDeleted?: () => void;
}

export default function LeaveApplicationRecordActions({
  row,
  onEdit,
  onDeleted
}: LeaveApplicationRecordActionsProps) {
  const record = row.original;
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const [viewOpen, setViewOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const canView = has('leave-application', 'view');
  const canEdit =
    has('leave-application', 'edit') || has('leave-management', 'edit');
  const canDelete = has('leave-application', 'delete');
  const canCancel =
    canEdit &&
    (record.status === 'pending' || record.status === 'approved');

  const onDeleteConfirmation = async () => {
    try {
      setLoading(true);
      const result = await deleteLeaveApplicationAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.errors?.message ?? 'Leave application deletion unsuccessful.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave application was deleted successfully.'
      });
      onDeleted?.();
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Leave application deletion unsuccessful.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

  const onCancelConfirmation = async () => {
    try {
      setLoading(true);
      const result = await cancelLeaveApplicationAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.errors?.message ?? 'Leave application cancel unsuccessful.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave application was cancelled successfully.'
      });
      onDeleted?.();
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Leave application cancel unsuccessful.'
      });
    } finally {
      setLoading(false);
      setShowCancelConfirmation(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <DataTableRowActions>
          {canView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setViewOpen(true)}
              title="View"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Button>
          )}
          {has('leave-application', 'edit') && record.status === 'pending' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit?.(record)}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCancelConfirmation(true)}
              title="Cancel"
            >
              <Ban className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteConfirmation(true)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </DataTableRowActions>
      </div>

      <LeaveApplicationViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        record={record}
      />

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDeleteConfirmation}
        loading={loading}
        title="Delete leave application?"
        description="This action cannot be undone. This will permanently delete this leave application."
        handleContinue={onDeleteConfirmation}
      />

      <CustomAlertDialog
        open={showCancelConfirmation}
        handleVisibilityChange={setShowCancelConfirmation}
        loading={loading}
        title="Cancel leave application?"
        description={
          record.status === 'approved'
            ? 'This will cancel the approved leave and reverse entitlement usage.'
            : 'This will cancel the pending leave application.'
        }
        handleContinue={onCancelConfirmation}
      />
    </>
  );
}
