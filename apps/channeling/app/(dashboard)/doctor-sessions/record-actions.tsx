'use client';

import React from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DoctorSession } from '@/types/doctor.session';
import { deleteDoctorSession } from '@/app/actions/doctor.sessions.action';
import { EditDoctorSessionDialog } from './edit-doctor-session-dialog';

type DoctorSessionActionsProps<TData extends DoctorSession> = {
  row: Row<TData>;
  /** When provided, edit dialog open state is controlled by parent (e.g. so the Doctor Session link can open the same dialog) */
  controlledEditOpen?: boolean;
  onControlledEditOpenChange?: (open: boolean) => void;
};

export function DoctorSessionRecordActions({
  row,
  controlledEditOpen,
  onControlledEditOpenChange
}: DoctorSessionActionsProps<DoctorSession>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [sessionIdToEdit, setSessionIdToEdit] = React.useState<string | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isControlled = controlledEditOpen !== undefined && onControlledEditOpenChange !== undefined;
  const dialogOpen = isControlled ? controlledEditOpen : editDialogOpen;

  // ==== DOCTOR SESSION DATA ROW ==== //
  const doctorSession = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const openEditDialog = () => {
    if (doctorSession.id) {
      if (isControlled) {
        onControlledEditOpenChange?.(true);
      } else {
        setSessionIdToEdit(doctorSession.id);
        setEditDialogOpen(true);
      }
    }
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    if (isControlled) {
      onControlledEditOpenChange?.(open);
    } else {
      setEditDialogOpen(open);
      if (!open) setSessionIdToEdit(null);
    }
  };

  const onDeleteConfirmation = async () => {
    if (doctorSession.id) {
      try {
        setLoading(true);
        await deleteDoctorSession(doctorSession.id);

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor session was deleted successfully.'
        });
        router.refresh();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Doctor session deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Doctor session id not found.'
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

      <EditDoctorSessionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          handleEditDialogOpenChange(open);
          if (!isControlled && !open) setSessionIdToEdit(null);
        }}
        sessionId={isControlled ? doctorSession.id ?? null : sessionIdToEdit}
      />

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this doctor and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
