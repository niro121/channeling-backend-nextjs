'use client';

import { useState } from 'react';
import { Briefcase, Eye, FileText, UserCheck } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { ResumeBankRecord } from '@/types/recruitment';
import { useResumeBankUi } from './resume-bank-ui-context';

type ResumeBankRecordActionsProps = {
  record: ResumeBankRecord;
  /** Compact icon buttons for card layout */
  compact?: boolean;
};

export default function ResumeBankRecordActions({
  record
}: ResumeBankRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openView, openResume, openAddToJob } = useResumeBankUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');
  const canAdd = has('recruitment', 'add');

  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!canView && !canEdit && !canAdd) return null;

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {canView ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`View ${record.candidateName}`}
            onClick={() => openView(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}

        {canView ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`View resume for ${record.candidateName}`}
            onClick={() => openResume(record)}
          >
            <FileText className="h-4 w-4" />
          </Button>
        ) : null}

        {canAdd ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Add ${record.candidateName} to job application`}
            onClick={() => openAddToJob(record)}
          >
            <Briefcase className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            aria-label={`Move ${record.candidateName} to shortlisting`}
            onClick={() => setShortlistOpen(true)}
          >
            <UserCheck className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={shortlistOpen}
        handleVisibilityChange={setShortlistOpen}
        loading={loading}
        title="Move to Shortlisting?"
        description={`Move ${record.candidateName} to Shortlisting?`}
        handleContinue={() => {
          setLoading(true);
          toast({
            title: 'Not saved',
            description: `Move ${record.candidateName} to Shortlisting will be wired in the workflow phase.`
          });
          setLoading(false);
          setShortlistOpen(false);
        }}
        className={{
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
        }}
      />
    </>
  );
}
