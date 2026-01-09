'use client';

import React from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import Link from 'next/link';
import { Room } from '@/types/room';
import { deleteRoom } from '@/app/actions/room.actions';

type RoomActionsProps<TData extends Room> = {
  row: Row<TData>;
};

export function RoomRecordActions({ row }: RoomActionsProps<Room>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  // ==== ROOM DATA ROW ==== //
  const room = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const onDeleteConfirmation = async () => {
    if (room.id) {
      try {
        setLoading(true);
        await deleteRoom(room.id);

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Room was deleted successfully.'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Room deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Room id not found.'
      });
    }
  };

  return (
    <>
      <DataTableRowActions>
        <DropdownMenuItem asChild>
          <Link href={`/rooms/${room.id}/edit`}>Edit</Link>
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
