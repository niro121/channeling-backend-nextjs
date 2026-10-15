'use client';

import { format, parseISO } from 'date-fns';
import { Download, Printer } from 'lucide-react';
import { Button, CustomDialog, useToast } from '@archmage/ui';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  PROBATION_PERIOD_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type AppointmentLetterRecord
} from '@/types/recruitment';

type DialogLetterPreviewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: AppointmentLetterRecord | null;
};

function formatDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMMM yyyy');
  } catch {
    return dateStr;
  }
}

function probationLabel(id: string): string {
  return PROBATION_PERIOD_OPTIONS.find((o) => o.id === id)?.name ?? id ?? '—';
}

export default function DialogLetterPreview({
  open,
  setOpen,
  record
}: DialogLetterPreviewProps) {
  const { toast } = useToast();
  const title = record
    ? `Appointment Letter · ${record.letterNumber}`
    : 'Appointment Letter';

  return (
    <CustomDialog open={open} setOpen={setOpen} title={title}>
      <div className="space-y-4 py-4">
        {record ? (
          <>
            <div
              id="appointment-letter-preview"
              className="space-y-4 rounded-md border border-border bg-muted/10 px-5 py-6 text-sm leading-relaxed"
            >
              <p className="text-center text-base font-semibold">
                Ruhunu Hospitals
              </p>
              <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">
                Appointment Letter
              </p>
              <p className="text-right text-xs text-muted-foreground">
                {formatDay(record.letterDate)}
              </p>
              <p>
                Dear <strong>{record.candidateName}</strong>,
              </p>
              <p>
                We are pleased to offer you the position of{' '}
                <strong>{record.position}</strong> in the{' '}
                <strong>{record.department}</strong> department on a{' '}
                <strong>
                  {VACANCY_EMPLOYMENT_TYPE_LABELS[record.employmentType]}
                </strong>{' '}
                basis, commencing on{' '}
                <strong>{formatDay(record.appointmentDate)}</strong>.
              </p>
              <p>
                Your remuneration will be <strong>{record.salary}</strong>.
                Probation period: <strong>{probationLabel(record.probationPeriod)}</strong>.
              </p>
              {record.reportingLocation ? (
                <p>
                  Please report to <strong>{record.reportingLocation}</strong>
                  {record.reportingManager
                    ? `, reporting to ${record.reportingManager}`
                    : ''}
                  .
                </p>
              ) : null}
              {record.benefits ? (
                <p>
                  <strong>Benefits:</strong> {record.benefits}
                </p>
              ) : null}
              {record.termsAndConditions ? (
                <p>
                  <strong>Terms:</strong> {record.termsAndConditions}
                </p>
              ) : null}
              <p className="pt-2">Yours sincerely,</p>
              <p className="font-medium">Human Resources</p>
              <p className="text-xs text-muted-foreground">
                Ref: {record.letterNumber}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className={`${buttonStyles.cancel.healthy} gap-1.5`}
                onClick={() =>
                  toast({
                    title: 'Download',
                    description: `PDF download for ${record.letterNumber} will be wired when document storage is available.`
                  })
                }
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`${buttonStyles.saveAndClose} gap-1.5`}
                onClick={() =>
                  toast({
                    title: 'Print',
                    description: `Print for ${record.letterNumber} will be wired when document storage is available.`
                  })
                }
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                type="button"
                className={buttonStyles.save}
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No letter selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
