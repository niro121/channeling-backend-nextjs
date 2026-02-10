'use client';

import React from 'react';
import { Doctor } from '@/types/doctor';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { deleteDoctor } from '@/app/actions/doctor.actions';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/hooks/use-permissions';

type DoctorActionsProps<TData extends Doctor> = {
  row: Row<TData>;
};

export function DoctorRecordActions({ row }: DoctorActionsProps<Doctor>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();

  // ==== DOCTOR DATA ROW ==== //
  const doctor = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
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
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => showHideDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

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
