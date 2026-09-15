'use client';

import React, { createContext, useContext, useState } from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteSession } from '@/app/actions/sessions.action';
import { EditSessionDialog } from './edit-session-dialog';
import type { SessionListItem } from './columns';

export const SessionRefetchContext = createContext<(() => void) | null>(null);

function useSessionRefetch(): () => void {
  const refetch = useContext(SessionRefetchContext);
  return refetch ?? (() => {});
}

type SessionRecordActionsProps = {
  row: Row<SessionListItem>;
  onRefetch?: () => void;
};

export function SessionRecordActions({ row, onRefetch }: SessionRecordActionsProps) {
  const refetchFromContext = useSessionRefetch();
  const onRefetchFn = onRefetch ?? refetchFromContext;
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { has } = usePermissions();
  const session = row.original;

  const onDeleteConfirmation = async () => {
    if (!session.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Session id not found.',
      });
      return;
    }
    try {
      setLoading(true);
      const result = await deleteSession(session.id);
      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: result.message ?? 'Session deleted successfully.',
        });
        onRefetchFn();
        setShowDeleteConfirmation(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message ?? 'Session deletion failed.',
        });
      }
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Session deletion failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {has('sessions', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('sessions', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <EditSessionDialog
        session={session}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onRefetchFn}
      />

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDeleteConfirmation}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this session and remove it from the list."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
