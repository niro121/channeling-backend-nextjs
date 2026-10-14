'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarClock,
  ClipboardCheck,
  Eye,
  Star,
  XCircle
} from 'lucide-react';
import {
  Button,
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
import { cancelInterviewAction } from '@/app/actions/recruitment-actions/interview.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  canCancelInterview,
  canEvaluateInterview,
  canRescheduleInterview,
  type InterviewRecord
} from '@/types/recruitment';
import { useInterviewScheduleUi } from './interview-schedule-ui-context';

type InterviewRecordActionsProps = {
  record: InterviewRecord;
};

export default function InterviewRecordActions({
  record
}: InterviewRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openView, openReschedule } = useInterviewScheduleUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!canView && !canEdit) return null;

  const evaluateIcon =
    record.status === 'completed' ? (
      <ClipboardCheck className="h-4 w-4" />
    ) : (
      <Star className="h-4 w-4" />
    );

  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelInterviewAction(
        record.id,
        cancelReason.trim() || undefined
      );
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cancel failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to cancel interview.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Cancelled',
        description: `${record.interviewCode} was cancelled.`
      });
      setCancelOpen(false);
      setCancelReason('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {canEdit && canRescheduleInterview(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Reschedule ${record.interviewCode}`}
            onClick={() => openReschedule(record)}
          >
            <CalendarClock className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canCancelInterview(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
            aria-label={`Cancel ${record.interviewCode}`}
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        ) : null}

        {canView ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`View ${record.interviewCode}`}
            onClick={() => openView(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canEvaluateInterview(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            aria-label={`Evaluate ${record.candidateName}`}
            asChild
          >
            <Link
              href={`/evaluation?interviewId=${encodeURIComponent(record.id)}`}
            >
              {evaluateIcon}
            </Link>
          </Button>
        ) : null}
      </div>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelReason('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Interview?</DialogTitle>
            <DialogDescription>
              Cancel the interview with {record.candidateName}? The candidate
              and panel will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`cancel-reason-${record.id}`}>
              Reason (optional)
            </Label>
            <Textarea
              id={`cancel-reason-${record.id}`}
              placeholder="Optional cancellation reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
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
                setCancelOpen(false);
                setCancelReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={buttonStyles.delete.danger}
              disabled={loading}
              onClick={handleCancel}
            >
              Cancel Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
