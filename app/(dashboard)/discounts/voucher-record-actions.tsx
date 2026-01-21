'use client';

import React from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { Voucher } from '@/types/voucher';
import { deleteOneVoucher } from '@/app/actions/discount.action';
import { useRouter } from 'next/navigation';

type VoucherActionsProps<TData extends Voucher> = {
  row: Row<TData>;
};

export function VoucherRecordActions({ row }: VoucherActionsProps<Voucher>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter()

  // ==== VOUCHER DATA ROW ==== //
  const voucher = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const onDeleteConfirmation = async () => {
    if (voucher.id) {
      try {
        setLoading(true);
        const result = await deleteOneVoucher(voucher.id);

        toast({
          variant: `${result.success ? 'success' : 'destructive'}`,
          title: `${result.success ? 'Success' : 'Error'}`,
          description: `${result.message || 'Voucher was deleted successfully.'}`
        });
        router.refresh()
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Voucher deletion unsuccessful.'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Voucher id not found.'
      });
    }
  };

  return (
    <>
      <DataTableRowActions>
        <DropdownMenuItem asChild>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => showHideDeleteModal(true)}>
          Remove
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
