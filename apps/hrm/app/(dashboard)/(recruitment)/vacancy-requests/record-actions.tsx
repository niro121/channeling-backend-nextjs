'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Eye, Megaphone, Pencil, X } from 'lucide-react';
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
  approveVacancyRequestAction,
  rejectVacancyRequestAction
} from '@/app/actions/recruitment-actions/vacancy-request.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  canLinkVacancyToJobPost,
  isVacancyEditable,
  isVacancyPendingApproval,
  type VacancyRequestRecord
} from '@/types/recruitment';
import { useVacancyRequestsUi } from './vacancy-requests-ui-context';

type Decision = 'approve' | 'link' | null;

type VacancyRecordActionsProps = {
  record: VacancyRequestRecord;
};

export default function VacancyRecordActions({
  record
}: VacancyRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openView, openEdit } = useVacancyRequestsUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');

  const editable = isVacancyEditable(record.status);
  const pending = isVacancyPendingApproval(record.status);
  const canLink = canLinkVacancyToJobPost(record.status);

  const [decision, setDecision] = useState<Decision>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const finishLinkToJobPost = () => {
    setDecision(null);
    if (record.linkedJobPost) {
      router.push('/job-posts');
      return;
    }
    router.push(`/job-posts?prefillVacancyId=${record.id}`);
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveVacancyRequestAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Approve failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to approve vacancy request.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Approved',
        description: `${record.requestId} approved successfully.`
      });
      setDecision(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const result = await rejectVacancyRequestAction(
        record.id,
        rejectReason.trim() || undefined
      );
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Reject failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to reject vacancy request.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Rejected',
        description: `${record.requestId} rejected.`
      });
      setRejectOpen(false);
      setRejectReason('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (!canView && !canEdit) return null;

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {canView ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`View ${record.requestId}`}
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
            aria-label={`Edit ${record.requestId}`}
            onClick={() => openEdit(record)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && pending ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              aria-label={`Approve ${record.requestId}`}
              onClick={() => setDecision('approve')}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
              aria-label={`Reject ${record.requestId}`}
              onClick={() => setRejectOpen(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : null}

        {canEdit && canLink ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
            aria-label={`Link ${record.requestId} to job post`}
            onClick={() => setDecision('link')}
          >
            <Megaphone className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={decision === 'approve'}
        handleVisibilityChange={(open) => {
          if (!open) setDecision(null);
        }}
        loading={loading}
        title="Approve?"
        description="Approve this vacancy request? A job post can then be created."
        handleContinue={() => void handleApprove()}
        className={{
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
        }}
      />

      <CustomAlertDialog
        open={decision === 'link'}
        handleVisibilityChange={(open) => {
          if (!open) setDecision(null);
        }}
        loading={loading}
        title="Link to job post?"
        description={
          record.linkedJobPost
            ? `${record.requestId} is already linked. Open Job Posts to review or edit the post.`
            : `Create a job post from ${record.requestId}? You can combine other approved vacancies for the same designation.`
        }
        handleContinue={finishLinkToJobPost}
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
              Reject this vacancy request? The requester will be notified.
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
