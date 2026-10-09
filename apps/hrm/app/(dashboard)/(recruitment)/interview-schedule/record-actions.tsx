'use client';

import { useState } from 'react';
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
              onClick={() => {
                setLoading(true);
                toast({
                  title: 'Not saved',
                  description: `Cancel ${record.interviewCode}${
                    cancelReason.trim()
                      ? ` (${cancelReason.trim()})`
                      : ''
                  } will be wired in the workflow phase.`
                });
                setLoading(false);
                setCancelOpen(false);
                setCancelReason('');
              }}
            >
              Cancel Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
