'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  Eye,
  FileText,
  History,
  UserCheck,
  XCircle
} from 'lucide-react';
import {
  Button,
  CustomAlertDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  useToast
} from '@archmage/ui';
import {
  rejectApplicationAction,
  shortlistApplicationAction
} from '@/app/actions/recruitment-actions/application.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  canRejectApplication,
  canScheduleInterview,
  canShortlistApplication,
  type ApplicationRecord
} from '@/types/recruitment';
import { useApplicationsUi } from './applications-ui-context';

type ApplicationRecordActionsProps = {
  record: ApplicationRecord;
};

export default function ApplicationRecordActions({
  record
}: ApplicationRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openView, openResume, openHistory, openSchedule } =
    useApplicationsUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');

  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!canView && !canEdit) return null;

  const handleShortlist = async () => {
    setLoading(true);
    try {
      const result = await shortlistApplicationAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Shortlist failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to shortlist application.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Shortlisted',
        description: `${record.candidateName} moved to shortlisted.`
      });
      setShortlistOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const result = await rejectApplicationAction(
        record.id,
        rejectReason.trim() || undefined
      );
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Reject failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to reject application.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Rejected',
        description: `${record.candidateName}'s application was rejected.`
      });
      setRejectOpen(false);
      setRejectReason('');
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
            aria-label={`View ${record.applicationId}`}
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

        {canEdit && canShortlistApplication(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            aria-label={`Shortlist ${record.candidateName}`}
            onClick={() => setShortlistOpen(true)}
          >
            <UserCheck className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canRejectApplication(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
            aria-label={`Reject ${record.candidateName}`}
            onClick={() => setRejectOpen(true)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canScheduleInterview(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Schedule interview for ${record.candidateName}`}
            onClick={() => openSchedule(record)}
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
        ) : null}

        {canView ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`History for ${record.candidateName}`}
            onClick={() => openHistory(record)}
          >
            <History className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={shortlistOpen}
        handleVisibilityChange={setShortlistOpen}
        loading={loading}
        title="Shortlist?"
        description={`Move ${record.candidateName} to Shortlisting?`}
        handleContinue={() => void handleShortlist()}
        className={{
          actionButton: buttonStyles.save
        }}
      />

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectReason('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject?</DialogTitle>
            <DialogDescription>
              Reject {record.candidateName}&apos;s application?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`reject-reason-${record.id}`}>
              Reason (optional)
            </Label>
            <Textarea
              id={`reject-reason-${record.id}`}
              placeholder="Optional rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2! sm:gap-2!">
            <Button
              type="button"
              variant="outline"
              className={`mr-0! ${buttonStyles.cancel.healthy}`}
              disabled={loading}
              onClick={() => {
                setRejectOpen(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={buttonStyles.delete.danger}
              disabled={loading}
              onClick={() => void handleReject()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
