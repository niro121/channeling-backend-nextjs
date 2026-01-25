'use client';

import React, { useState } from 'react';
import { Agency } from '@/types/agency';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { deleteAgency } from '@/app/actions/agency.actions';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { BinIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';

interface AgencyActionsProps<TData extends Agency> {
  row: Row<TData>;
}

const AgencyRecordActions = <TData extends Agency>({
  row
}: AgencyActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const agency = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const onDeleteConfirmation = async () => {
    if (agency.id) {
      try {
        setLoading(true);
        const result = await deleteAgency(agency.id);

        if (result.isError) {
          throw new Error(result.errors.message);
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Agency was deleted successfully'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Agency deletion unsuccessful'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Agency id not found.'
      });
    }
  };

  return (
    <>
      <DataTableRowActions>
        <Button
          variant={'link'}
          className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
          onClick={() => router.push(`/agencies/${agency.id}/edit`)}
        >
          <Edit className="w-5 h-5" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant={'link'}
          className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
          onClick={() => showHideDeleteModal(true)}
        >
          <BinIcon className="w-5 h-5 text-red-600" />
          <span className="sr-only">Delete</span>
        </Button>
      </DataTableRowActions>

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this
                    agency and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
};

export default AgencyRecordActions;
