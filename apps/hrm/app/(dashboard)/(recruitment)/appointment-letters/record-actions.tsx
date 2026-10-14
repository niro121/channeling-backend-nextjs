'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Pencil,
  Printer,
  Send,
  UserPlus,
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
  acceptAppointmentLetterAction,
  declineAppointmentLetterAction,
  generateAppointmentLetterAction,
  sendAppointmentLetterAction
} from '@/app/actions/recruitment-actions/appointment-letter.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  canAcceptAppointmentLetter,
  canDeclineAppointmentLetter,
  canDownloadAppointmentLetter,
  canEditAppointmentLetter,
  canGenerateAppointmentLetter,
  canOnboardFromAppointmentLetter,
  canSendAppointmentLetter,
  type AppointmentLetterRecord
} from '@/types/recruitment';
import { useAppointmentLettersUi } from './appointment-letters-ui-context';

type AppointmentLetterRecordActionsProps = {
  record: AppointmentLetterRecord;
};

export default function AppointmentLetterRecordActions({
  record
}: AppointmentLetterRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openView, openEdit, openLetterPreview } = useAppointmentLettersUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');
  const canAdd = has('recruitment', 'add');

  const [sendOpen, setSendOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!canView && !canEdit && !canAdd) return null;

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateAppointmentLetterAction(record.id);
    setLoading(false);
    if (result.isError || !result.data?.record) {
      toast({
        variant: 'destructive',
        title: 'Could not generate',
        description:
          (result.errors as { message?: string })?.message ??
          'Please try again.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Letter generated',
      description: `Appointment letter for ${result.data.record.candidateName} is ready to preview.`
    });
    openLetterPreview(result.data.record);
    router.refresh();
  };

  const handleSend = async () => {
    setLoading(true);
    const result = await sendAppointmentLetterAction(record.id);
    setLoading(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Could not send',
        description:
          (result.errors as { message?: string })?.message ??
          'Please try again.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Letter sent',
      description:
        result.data?.message ??
        `${record.letterNumber} issued to ${record.candidateName}.`
    });
    setSendOpen(false);
    router.refresh();
  };

  const handleAccept = async () => {
    setLoading(true);
    const result = await acceptAppointmentLetterAction(record.id);
    setLoading(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Could not accept',
        description:
          (result.errors as { message?: string })?.message ??
          'Please try again.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Offer accepted',
      description: `${record.letterNumber} marked as accepted.`
    });
    setAcceptOpen(false);
    router.refresh();
  };

  const handleDecline = async () => {
    setLoading(true);
    const result = await declineAppointmentLetterAction(
      record.id,
      declineReason
    );
    setLoading(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Could not decline',
        description:
          (result.errors as { message?: string })?.message ??
          'Please try again.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Offer declined',
      description: `${record.letterNumber} marked as declined.`
    });
    setDeclineOpen(false);
    setDeclineReason('');
    router.refresh();
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
            aria-label={`View ${record.letterNumber}`}
            onClick={() => openView(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canEditAppointmentLetter(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${record.letterNumber}`}
            onClick={() => openEdit(record)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canGenerateAppointmentLetter(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Generate letter for ${record.candidateName}`}
            disabled={loading}
            onClick={() => void handleGenerate()}
          >
            <FileText className="h-4 w-4" />
          </Button>
        ) : null}

        {canView && canDownloadAppointmentLetter(record) ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Download PDF for ${record.letterNumber}`}
              onClick={() =>
                toast({
                  title: 'Download',
                  description: `PDF download for ${record.letterNumber} will be wired when document storage is available.`
                })
              }
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Print ${record.letterNumber}`}
              onClick={() =>
                toast({
                  title: 'Print',
                  description: `Print for ${record.letterNumber} will be wired when document storage is available.`
                })
              }
            >
              <Printer className="h-4 w-4" />
            </Button>
          </>
        ) : null}

        {canEdit && canSendAppointmentLetter(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Send ${record.letterNumber}`}
            onClick={() => setSendOpen(true)}
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canAcceptAppointmentLetter(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            aria-label={`Accept ${record.candidateName}`}
            onClick={() => setAcceptOpen(true)}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && canDeclineAppointmentLetter(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
            aria-label={`Decline ${record.candidateName}`}
            onClick={() => setDeclineOpen(true)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        ) : null}

        {canAdd && canOnboardFromAppointmentLetter(record) ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
            aria-label={`Staff onboarding for ${record.candidateName}`}
            asChild
          >
            <Link
              href={`/staff?from=appointment&letterId=${encodeURIComponent(record.id)}&candidate=${encodeURIComponent(record.candidateName)}`}
            >
              <UserPlus className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={sendOpen}
        handleVisibilityChange={setSendOpen}
        loading={loading}
        title="Send?"
        description={`Email and/or SMS this letter to ${record.candidateName}?`}
        handleContinue={() => void handleSend()}
        className={{
          actionButton: buttonStyles.save
        }}
      />

      <CustomAlertDialog
        open={acceptOpen}
        handleVisibilityChange={setAcceptOpen}
        loading={loading}
        title="Mark as Accepted?"
        description={`Record ${record.candidateName}'s acceptance? Staff onboarding can then begin.`}
        handleContinue={() => void handleAccept()}
        className={{
          actionButton: buttonStyles.save
        }}
      />

      <Dialog
        open={declineOpen}
        onOpenChange={(open) => {
          setDeclineOpen(open);
          if (!open) setDeclineReason('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Declined?</DialogTitle>
            <DialogDescription>
              Record that {record.candidateName} declined the offer?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`decline-reason-${record.id}`}>
              Reason (optional)
            </Label>
            <Textarea
              id={`decline-reason-${record.id}`}
              placeholder="Optional decline reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
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
                setDeclineOpen(false);
                setDeclineReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={buttonStyles.delete.danger}
              disabled={loading}
              onClick={() => void handleDecline()}
            >
              Mark as Declined
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
