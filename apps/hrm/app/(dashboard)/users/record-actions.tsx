'use client';

import React, { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { userTypes } from '@archmage/shared';
import {
  Button,
  CustomAlertDialog,
  DataTableRowActions,
  useToast
} from '@archmage/ui';
import type { HrmUser } from '@/types/user';
import { deleteUser } from '@/app/actions/user-usergrp-actions/user.actions';
import { usePermissions } from '@/components/hooks/use-permissions';

interface UserActionsProps<TData extends HrmUser> {
  row: Row<TData>;
}

export default function UserRecordActions<TData extends HrmUser>({
  row
}: UserActionsProps<TData>) {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();

  const user = row.original;
  const isPlatformAdmin = user.userType === userTypes.admin;

  const onDeleteConfirmation = async () => {
    if (!user.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User id not found.'
      });
      return;
    }

    try {
      setLoading(true);
      await deleteUser(user.id);
      toast({
        variant: 'success',
        title: 'Success',
        description: 'User was deleted successfully.'
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'User deletion unsuccessful.'
      });
    } finally {
      setLoading(false);
      setShowDelConfirmation(false);
    }
  };

  if (isPlatformAdmin) {
    return <span className="text-xs text-muted-foreground whitespace-nowrap">Read-only</span>;
  }

  return (
    <>
      <DataTableRowActions>
        {has('users', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/users/${user.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has('users', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDelConfirmation(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDelConfirmation}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this user."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
