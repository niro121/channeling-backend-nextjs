'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Eye, FileText, Pencil, UserCheck } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { markResumeBankShortlistedAction } from '@/app/actions/recruitment-actions/resume-bank.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  canMoveResumeToShortlisting,
  type ResumeBankRecord
} from '@/types/recruitment';
import { useResumeBankUi } from './resume-bank-ui-context';

type ResumeBankRecordActionsProps = {
  record: ResumeBankRecord;
};

export default function ResumeBankRecordActions({
  record
}: ResumeBankRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openView, openResume, openAddToJob, openEdit } = useResumeBankUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');
  const canAdd = has('recruitment', 'add');
  const canShortlist = canEdit && canMoveResumeToShortlisting(record.status);

  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!canView && !canEdit && !canAdd) return null;

  const handleShortlist = async () => {
    setLoading(true);
    try {
      const result = await markResumeBankShortlistedAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Shortlist failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to update profile status.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Shortlisted',
        description: `${record.candidateName} marked shortlisted.`
      });
      setShortlistOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

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

        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${record.candidateName}`}
            onClick={() => openEdit(record)}
          >
            <Pencil className="h-4 w-4" />
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

        {canShortlist ? (
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
        description={`Mark ${record.candidateName} as shortlisted in the resume bank? Full Shortlisting register actions arrive in Wave 5.`}
        handleContinue={() => void handleShortlist()}
        className={{
          actionButton: `${buttonStyles.save} gap-1.5`
        }}
      />
    </>
  );
}
