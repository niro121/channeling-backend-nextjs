'use client';

import React from 'react';
import { Speciality } from '@/types/speciality';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import Link from 'next/link';
import { deleteSpeciality } from '@/app/actions/speciality.actions';

type SpecialityActionsProps<TData extends Speciality> = {
  row: Row<TData>;
};

export function SpecialityRecordActions({
  row
}: SpecialityActionsProps<Speciality>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  // ==== SPECIALITY DATA ROW ==== //
  const speciality = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const onDeleteConfirmation = async () => {
    if (speciality.id) {
      try {
        setLoading(true);
        await deleteSpeciality(speciality.id);

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Speciality was deleted successfully.'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Speciality deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Speciality id not found.'
      });
    }
  };

  return (
    <>
      <DataTableRowActions>
        <DropdownMenuItem asChild>
          <Link href={`/specialities/${speciality.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => showHideDeleteModal(true)}>
          Delete
        </DropdownMenuItem>
      </DataTableRowActions>

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this
                                speciality and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
