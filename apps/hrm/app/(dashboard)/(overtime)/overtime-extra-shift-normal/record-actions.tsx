'use client';

import { useState } from 'react';
import { Row } from '@tanstack/react-table';
import {
  Button,
  CustomAlertDialog,
  DataTableRowActions,
  useToast
} from '@archmage/ui';
import { Eye, Pencil, Printer, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { ExtraShiftNormalRecord } from './sample-data';
import { ExtraShiftNormalViewDialog } from './view-dialog';

type ExtraShiftNormalRecordActionsProps = {
  row: Row<ExtraShiftNormalRecord>;
  onEdit?: (record: ExtraShiftNormalRecord) => void;
};

export default function ExtraShiftNormalRecordActions({
  row,
  onEdit
}: ExtraShiftNormalRecordActionsProps) {
  const record = row.original;
  const { toast } = useToast();
  const { has } = usePermissions();
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canView = has('overtime-requests', 'view');
  const canEdit = has('overtime-requests', 'edit');
  const canDelete = has('overtime-requests', 'delete');

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

      <ExtraShiftNormalViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        record={record}
      />

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        loading={false}
        title="Delete extra shift form?"
        description={`This will delete ${record.formNumber} for ${record.staffName}. Saving is wired in the CRUD phase.`}
        handleContinue={() => {
          toast({
            title: 'Not saved',
            description: 'Extra shift delete will be wired in the CRUD phase.'
          });
          setDeleteOpen(false);
        }}
      />
    </>
  );
}
