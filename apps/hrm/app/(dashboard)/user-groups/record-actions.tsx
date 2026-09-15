'use client';

import React, { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  CustomAlertDialog,
  DataTableRowActions,
  useToast
} from '@archmage/ui';
import type { UserGroup } from '@/types/user-group';
import { deleteUserGroup } from '@/app/actions/user-usergrp-actions/user-group.actions';
import { usePermissions } from '@/components/hooks/use-permissions';

interface UserGroupActionsProps<TData extends UserGroup> {
  row: Row<TData>;
}

export default function UserGroupRecordActions<TData extends UserGroup>({
  row
}: UserGroupActionsProps<TData>) {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();

  const userGroup = row.original;

  const onDeleteConfirmation = async () => {
    if (!userGroup.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User group id not found.'
      });
      return;
    }

    try {
      setLoading(true);
      await deleteUserGroup(userGroup.id);
      toast({
        variant: 'success',
        title: 'Success',
        description: 'User group was deleted successfully.'
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'User group deletion unsuccessful.'
      });
    } finally {
      setLoading(false);
      setShowDelConfirmation(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {has('users', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/user-groups/${userGroup.id}/edit`)}
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
        description="This action cannot be undone. This will permanently delete this user group."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
