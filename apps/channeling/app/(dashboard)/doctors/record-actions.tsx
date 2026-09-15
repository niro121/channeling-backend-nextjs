'use client';

import React from 'react';
import { Doctor } from '@/types/doctor';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialogWithWarning from '@/components/common/custom-alert-dialog-with-warning';
import { deleteDoctor, checkDoctorHasActiveSessionsOrLeaves } from '@/app/actions/doctor.actions';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/hooks/use-permissions';

type DoctorActionsProps<TData extends Doctor> = {
  row: Row<TData>;
};

export function DoctorRecordActions({ row }: DoctorActionsProps<Doctor>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fetchingCheck, setFetchingCheck] = React.useState(false);
  const [hasActiveSessionsOrLeaves, setHasActiveSessionsOrLeaves] = React.useState<{
    hasActiveSessions: boolean;
    hasApprovedLeaves: boolean;
  } | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();

  // ==== DOCTOR DATA ROW ==== //
  const doctor = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
    if (!value) {
      // Reset check when dialog is closed
      setHasActiveSessionsOrLeaves(null);
    }
  };

  const handleDeleteClick = async () => {
    if (!doctor.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Doctor id not found.'
      });
      return;
    }

    // Fetch check before showing dialog
    setFetchingCheck(true);
    try {
      const result = await checkDoctorHasActiveSessionsOrLeaves(doctor.id);
      if (result.success && result.data) {
        setHasActiveSessionsOrLeaves(result.data);
        setShowDelConfirmation(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error?.message || 'Failed to check doctor sessions and leaves.'
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to check doctor sessions and leaves.'
      });
    } finally {
      setFetchingCheck(false);
    }
  };

  const onDeleteConfirmation = async () => {
    if (doctor.id) {
      try {
        setLoading(true);
        await deleteDoctor(doctor.id);

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor was deleted successfully.'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Doctor deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Doctor id not found.'
      });
    }
  };

// Generate description component based on check result
const getDeleteDescription = () => {
  if (hasActiveSessionsOrLeaves === null) {
    return <span>Loading...</span>;
  }

  if (hasActiveSessionsOrLeaves.hasActiveSessions || hasActiveSessionsOrLeaves.hasApprovedLeaves) {
    return (
      <>
        One or more selected doctors have active sessions and/or approved leave records. Deleting them may affect scheduled appointments and availability records.

        <br />
        <br />
        Are you sure you want to continue?
      </>
    );
  }

  return "This action cannot be undone. This will permanently delete this doctor and remove the data from our servers.";
};

  return (
    <>
      <DataTableRowActions>
        {has('doctors', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/doctors/${doctor.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('doctors', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            onClick={handleDeleteClick}
            disabled={fetchingCheck}
          >
            {fetchingCheck ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <CustomAlertDialogWithWarning
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description={getDeleteDescription()}
        handleContinue={onDeleteConfirmation}
        hasWarning={hasActiveSessionsOrLeaves !== null && (hasActiveSessionsOrLeaves.hasActiveSessions || hasActiveSessionsOrLeaves.hasApprovedLeaves)}
      />
    </>
  );
}
