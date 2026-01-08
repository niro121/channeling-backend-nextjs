'use client';

import React from 'react';
import { Location } from '@/types/location';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import Link from 'next/link';
import { deleteLocation } from '@/app/actions/location.action';

type LocationActionsProps<TData extends Location> = {
  row: Row<TData>;
};

export function LocationRecordActions({ row }: LocationActionsProps<Location>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  // ==== LOCATION DATA ROW ==== //
  const location = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const onDeleteConfirmation = async () => {
    if (location.id) {
      try {
        setLoading(true);
        await deleteLocation(location.id);

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Location was deleted successfully.'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Location deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Location id not found.'
      });
    }
  };

  return (
    <>
      <DataTableRowActions>
        <DropdownMenuItem asChild>
          <Link href={`/locations/${location.id}/edit`}>Edit</Link>
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
        description="This action cannot be undone. This will permanently delete this doctor and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
