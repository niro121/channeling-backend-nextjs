'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deletePublicHolidayShiftAction } from '@/app/actions/roster-actions/public-holiday-shift.actions';
import type { PublicHolidayShiftRecord } from '@/types/roster';
import { usePublicHolidayShiftsUi } from './public-holiday-shifts-ui-context';
import { buttonStyles } from '@/lib/utils/common-styles';

type HolidayRecordActionsProps = {
  record: PublicHolidayShiftRecord;
};

export default function HolidayRecordActions({
  record
}: HolidayRecordActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openEdit, openHistory } = usePublicHolidayShiftsUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit holiday shift for ${record.staffName}`}
            onClick={() => openEdit(record)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete holiday shift for ${record.staffName}`}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`History for ${record.staffName}`}
          onClick={() => openHistory(record)}
        >
          <Clock3 className="h-4 w-4" />
        </Button>
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete holiday shift?"
        description={`This will remove the holiday duty for ${record.staffName} (${record.staffCode}) on ${record.holidayName}.`}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await deletePublicHolidayShiftAction(record.id);
            if (result.isError) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description:
                  result.errors?.message ||
                  'Holiday shift deletion unsuccessful.'
              });
            } else {
              toast({
                variant: 'success',
                title: 'Success',
                description: 'Holiday shift was deleted successfully.'
              });
              router.refresh();
            }
          } finally {
            setLoading(false);
            setOpen(false);
          }
        }}
        className={{
          actionButton: buttonStyles.delete.danger,
          cancelButton: `h-9!`
        }}
      />
    </>
  );
}
