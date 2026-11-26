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
import { Eye, Pencil, Printer, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteExtraTimeAction } from '@/app/actions/overtime-actions/overtime-extra-time.actions';
import type { ExtraTimeRecord } from '@/types/overtime';
import { ExtraTimeViewDialog } from './view-dialog';

type ExtraTimeRecordActionsProps = {
  row: Row<ExtraTimeRecord>;
  onEdit?: (record: ExtraTimeRecord) => void;
};

export default function ExtraTimeRecordActions({
  row,
  onEdit
}: ExtraTimeRecordActionsProps) {
  const record = row.original;
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canView = has('overtime-requests', 'view');
  const canEdit = has('overtime-requests', 'edit');
  const canDelete = has('overtime-requests', 'delete');

  const handleDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteExtraTimeAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (result.errors as { message?: string })?.message ??
            'Extra time delete unsuccessful.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Extra time form deleted successfully.'
      });
      setDeleteOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Extra time delete unsuccessful.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <DataTableRowActions>
          {canView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setViewOpen(true)}
              title="View"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Button>
          )}
          {canView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() =>
                toast({
                  title: 'Print',
                  description: 'Print will be wired in a later phase.'
                })
              }
              title="Print"
            >
              <Printer className="h-4 w-4" />
              <span className="sr-only">Print</span>
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit?.(record)}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </DataTableRowActions>
      </div>

      <ExtraTimeViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        record={record}
      />

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        loading={loading}
        title="Delete extra time form?"
        description={`This will delete ${record.formNumber} for ${record.staffName}.`}
        handleContinue={handleDelete}
      />
    </>
  );
}
