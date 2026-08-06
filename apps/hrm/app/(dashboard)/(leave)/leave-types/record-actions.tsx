'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Row } from '@tanstack/react-table';
import {
  Button,
  CustomAlertDialog,
  DataTableRowActions,
  useToast
} from '@archmage/ui';
import { Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LeaveTypeRecord } from './columns';

interface LeaveTypeRecordActionsProps {
  row: Row<LeaveTypeRecord>;
}

export default function LeaveTypeRecordActions({
  row
}: LeaveTypeRecordActionsProps) {
  const leaveType = row.original;
  const router = useRouter();
  const { has } = usePermissions();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      // TODO: wire leave type delete action
      toast({
        variant: 'success',
        title: 'Success',
        description: `Delete stub for ${leaveType.name}.`
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {has('leave-types', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/leave-types/${leaveType.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('leave-types', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete leave type?"
        description={`This will remove ${leaveType.name}. This action cannot be undone.`}
        handleContinue={onDelete}
      />
    </>
  );
}
