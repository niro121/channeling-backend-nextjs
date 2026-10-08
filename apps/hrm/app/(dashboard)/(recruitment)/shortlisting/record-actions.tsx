'use client';

import { useState } from 'react';
import {
  CalendarPlus,
  Eye,
  FileText,
  History,
  PauseCircle,
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
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  canHoldFromRegister,
  canRejectApplication,
  canScheduleInterview,
  canShortlistFromRegister,
  type ShortlistingRecord
} from '@/types/recruitment';
import { useShortlistingUi } from './shortlisting-ui-context';

type ShortlistingRecordActionsProps = {
  record: ShortlistingRecord;
};

export default function ShortlistingRecordActions({
  record
}: ShortlistingRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openView, openResume, openHistory, openSchedule } =
    useShortlistingUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');

  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const finishUiOnly = (title: string, description: string) => {
    setLoading(true);
    toast({ title, description });
    setLoading(false);
    setShortlistOpen(false);
    setHoldOpen(false);
    setRejectOpen(false);
    setRejectReason('');
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
            aria-label={`History for ${record.candidateName}`}
            onClick={() => openHistory(record)}
          >
            <History className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canShortlistFromRegister(record) ? (
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

        {canEdit && canHoldFromRegister(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            aria-label={`Hold ${record.candidateName}`}
            onClick={() => setHoldOpen(true)}
          >
            <PauseCircle className="h-4 w-4" />
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
      </div>

      <CustomAlertDialog
        open={shortlistOpen}
        handleVisibilityChange={setShortlistOpen}
        loading={loading}
        title="Shortlist?"
        description={`Shortlist ${record.candidateName} for interview?`}
        handleContinue={() =>
          finishUiOnly(
            'Not saved',
            `Shortlist for ${record.candidateName} will be wired in the workflow phase.`
          )
        }
        className={{
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
        }}
      />

      <CustomAlertDialog
        open={holdOpen}
        handleVisibilityChange={setHoldOpen}
        loading={loading}
        title="Hold?"
        description={`Place ${record.candidateName} on hold?`}
        handleContinue={() =>
          finishUiOnly(
            'Not saved',
            `Hold for ${record.candidateName} will be wired in the workflow phase.`
          )
        }
        className={{
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
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
              Reject {record.candidateName}? The candidate will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`sl-reject-reason-${record.id}`}>
              Reason (optional)
            </Label>
            <Textarea
              id={`sl-reject-reason-${record.id}`}
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
              onClick={() =>
                finishUiOnly(
                  'Not saved',
                  `Reject for ${record.candidateName}${
                    rejectReason.trim()
                      ? ` (${rejectReason.trim()})`
                      : ''
                  } will be wired in the workflow phase.`
                )
              }
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
