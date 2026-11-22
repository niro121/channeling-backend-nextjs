'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteShiftRosterStaffAllocationsAction } from '@/app/actions/roster-actions/shift-roster.actions';
import type { RosterStaffRow } from '@/types/roster';
import { useShiftRosterUi } from './shift-roster-ui-context';
import { buttonStyles } from '@/lib/utils/common-styles';

type RosterRecordActionsProps = {
  record: RosterStaffRow;
  dayIsos: string[];
};

export default function RosterRecordActions({
  record,
  dayIsos
}: RosterRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit, openHistory, openView } = useShiftRosterUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  const cells = useMemo(
    () => dayIsos.flatMap((d) => record.shifts[d] ?? []),
    [dayIsos, record.shifts]
  );
  const draftCount = cells.filter((cell) => cell.status === 'draft').length;
  const lockedCount = cells.length - draftCount;
  const hasAllocations = cells.length > 0;
  const onlyLocked = hasAllocations && draftCount === 0;

  const fromDate = dayIsos[0] ?? '';
  const toDate = dayIsos[dayIsos.length - 1] ?? '';

  const handleEdit = () => {
    const dateIso = dayIsos.find((d) => (record.shifts[d] ?? []).length > 0);
    if (!dateIso) {
      toast({
        title: 'No shift allocated this week',
        description: 'Use Allocate Shift or click an empty day cell.'
      });
      return;
    }
    const shift = record.shifts[dateIso]?.[0];
    if (!shift) return;
    openEdit({ row: record, dateIso, shift });
  };

  const deleteDescription = !hasAllocations
    ? `No allocations found for ${record.staffName} (${record.staffCode}) in this range.`
    : onlyLocked
      ? `Published/amended cells for ${record.staffName} (${record.staffCode}) cannot be removed here. Use a roster amendment.`
      : lockedCount > 0
        ? `This will remove ${draftCount} draft allocation(s) for ${record.staffName} (${record.staffCode}). ${lockedCount} published/amended cell(s) will be left unchanged.`
        : `This will remove ${draftCount} draft allocation(s) for ${record.staffName} (${record.staffCode}) in this range.`;

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full border border-border"
          aria-label={`View roster for ${record.staffName}`}
          onClick={() => openView(record)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full border border-border"
            aria-label={`Edit roster for ${record.staffName}`}
            onClick={handleEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full border border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete roster for ${record.staffName}`}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full border border-border"
          aria-label={`History for ${record.staffName}`}
          onClick={() => openHistory(record)}
        >
          <Clock3 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete allocation?"
        description={deleteDescription}
        handleContinue={async () => {
          if (!hasAllocations || onlyLocked || !fromDate || !toDate) {
            setOpen(false);
            if (onlyLocked) {
              toast({
                variant: 'destructive',
                title: 'Locked',
                description:
                  'Published and amended cells can only be changed via Roster Amendments.'
              });
            }
            return;
          }

          setLoading(true);
          const result = await deleteShiftRosterStaffAllocationsAction({
            staffId: record.staffId,
            fromDate,
            toDate,
            staffName: record.staffName,
            staffCode: record.staffCode
          });
          setLoading(false);

          if (result.isError) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description:
                (result.errors as { message?: string })?.message ??
                'Roster allocations could not be deleted.'
            });
            return;
          }

          toast({
            variant: 'success',
            title: 'Success',
            description:
              (result.data as { message?: string } | null)?.message ??
              'Draft allocations deleted.'
          });
          setOpen(false);
          router.refresh();
        }}
        className={{ actionButton: buttonStyles.delete.danger }}
      />
    </>
  );
}
