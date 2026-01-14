'use client';

import React from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import Link from 'next/link';
import { Discount } from '@/types/discount';
import { deleteDiscount } from '@/app/actions/discount.action';

type DiscountActionsProps<TData extends Discount> = {
  row: Row<TData>;
};

export function DiscountRecordActions({ row }: DiscountActionsProps<Discount>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  // ==== DISCOUNT DATA ROW ==== //
  const discount = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const onDeleteConfirmation = async () => {
    if (discount.id) {
      try {
        setLoading(true);
        await deleteDiscount(discount.id);

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Discount was deleted successfully.'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Discount deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Discount id not found.'
      });
    }
  };

  return (
    <>
      <DataTableRowActions>
        <DropdownMenuItem asChild>
          <Link href={`/discounts/${discount.id}/edit`}>Edit</Link>
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
