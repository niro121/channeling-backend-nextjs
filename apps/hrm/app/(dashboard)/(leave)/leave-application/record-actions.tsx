'use client';

import { useState } from 'react';
import { Row } from '@tanstack/react-table';
import {
  Button,
  CustomAlertDialog,
  DataTableRowActions,
  useToast
} from '@archmage/ui';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LeaveApplicationRecord } from './columns';
import { LeaveApplicationViewDialog } from './view-dialog';

interface LeaveApplicationRecordActionsProps {
  row: Row<LeaveApplicationRecord>;
}

export default function LeaveApplicationRecordActions({
  row
}: LeaveApplicationRecordActionsProps) {
  const record = row.original;
  const { toast } = useToast();
  const { has } = usePermissions();
  const [viewOpen, setViewOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const canView = has('leave-application', 'view');
  const canEdit = has('leave-application', 'edit');
  const canDelete = has('leave-application', 'delete');

  const onDeleteConfirmation = async () => {
    try {
      setLoading(true);
      // Stub until leave-application delete API exists.
      console.info('[leave-application] delete stub', record.id);
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave application was deleted successfully.'
      });
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
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                // TODO: navigate to edit leave application
                console.info('[leave-application] edit stub', record.id);
                toast({
                  title: 'Edit',
                  description: 'Edit leave application is not wired yet.'
                });
              }}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
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
    </>
  );
}
