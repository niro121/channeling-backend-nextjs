'use client';

import { Copy, Eye, Pencil, Users } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  isJobPostEditable,
  type JobPostRecord
} from '@/types/recruitment';
import { useJobPostsUi } from './job-posts-ui-context';

type JobPostRecordActionsProps = {
  record: JobPostRecord;
};

export default function JobPostRecordActions({
  record
}: JobPostRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openView, openEdit, openDuplicate } = useJobPostsUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');
  const canAdd = has('recruitment', 'add');
  const editable = isJobPostEditable(record.status);

  if (!canView && !canEdit && !canAdd) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {canView ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`View ${record.jobPostId}`}
          onClick={() => openView(record)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ) : null}

      {canEdit && editable ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Edit ${record.jobPostId}`}
          onClick={() => openEdit(record)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}

      {canAdd ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Duplicate ${record.jobPostId}`}
          onClick={() => openDuplicate(record)}
        >
          <Copy className="h-4 w-4" />
        </Button>
      ) : null}

      {canView ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
          aria-label={`View applications for ${record.jobPostId}`}
          onClick={() =>
            toast({
              title: 'Applications',
              description: `Applications for ${record.jobPostId} will open when the Applications module is built.`
            })
          }
        >
          <Users className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
