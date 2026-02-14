'use client';

import React from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DoctorLeaveListItem } from '@/types/doctor.leave';
import { deleteOneDoctorLeave } from '@/app/actions/doctor.leave.action';
import { EditDoctorLeaveDialog } from './edit-doctor-leave-dialog';

type DoctorLeaveRecordActionsProps<TData extends DoctorLeaveListItem> = {
  row: Row<TData>;
};

export function DoctorLeaveRecordActions({
  row
}: DoctorLeaveRecordActionsProps<DoctorLeaveListItem>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [leaveIdToEdit, setLeaveIdToEdit] = React.useState<string | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const leave = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const openEditDialog = () => {
    if (leave.id) {
      setLeaveIdToEdit(leave.id);
      setEditDialogOpen(true);
    }
  };

  const onDeleteConfirmation = async () => {
    if (leave.id) {
      try {
        setLoading(true);
        const result = await deleteOneDoctorLeave(leave.id);

        if (result.success) {
          toast({
            variant: 'success',
            title: 'Success',
            description: result.message ?? 'Doctor leave was deleted successfully.'
          });
          router.refresh();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error?.message ?? 'Doctor leave deletion unsuccessful.'
          });
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Doctor leave deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Doctor leave id not found.'
      });
    }
  };

  return (
    <>
      <DataTableRowActions>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={openEditDialog}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => showHideDeleteModal(true)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </DataTableRowActions>

      <EditDoctorLeaveDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setLeaveIdToEdit(null);
        }}
        leaveId={leaveIdToEdit}
      />

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this doctor leave and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
