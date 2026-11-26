'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Row } from '@tanstack/react-table';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, DataTableRowActions, useToast } from '@archmage/ui';
import type { UserGroup } from '@archmage/shared';
import { deleteDpayUserGroupAction } from '@/app/actions/user-groups/user-group.actions';

export default function UserGroupRecordActions({
  row,
  canAdd,
  canEdit,
  canDelete,
}: {
  row: Row<UserGroup>;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const userGroup = row.original;

  const onDelete = async () => {
    if (!userGroup.id) return;
    setLoading(true);
    try {
      await deleteDpayUserGroupAction(userGroup.id);
      toast({ title: 'Success', description: 'User group was deleted successfully.' });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'User group deletion unsuccessful.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {canEdit && userGroup.id ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/user-groups/${userGroup.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        ) : null}
        {canAdd && userGroup.id ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Copy and create"
            onClick={() => router.push(`/user-groups/add?copyFrom=${userGroup.id}`)}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copy and create</span>
          </Button>
        ) : null}
        {canDelete && userGroup.id ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        ) : null}
      </DataTableRowActions>
      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this user group and remove the data from our servers."
        handleContinue={onDelete}
      />
    </>
  );
}
