'use client';

import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { StaffRosterMemberRow } from '@/types/manage-roster';
import { useManageRosterUi } from './manage-roster-ui-context';

type StaffRosterRecordActionsProps = {
  record: StaffRosterMemberRow;
};

export default function StaffRosterRecordActions({
  record
}: StaffRosterRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openRemoveConfirm } = useManageRosterUi();
  const canEdit = has('manage-rosters', 'edit');

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`View ${record.staffName}`}
        asChild
      >
        <Link
          href={`/staff?keyword=${encodeURIComponent(record.staffCode)}`}
          title={`View ${record.staffName} in Staff`}
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View</span>
        </Link>
      </Button>

      {canEdit ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove ${record.staffName} from roster`}
          onClick={() => {
            if (record.hasStandingAssignments) {
              toast({
                variant: 'destructive',
                title: 'Membership locked',
                description:
                  'Standing shift assignment(s) exist. Update Shift Assignment before removing roster membership.'
              });
              return;
            }
            openRemoveConfirm(record);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
