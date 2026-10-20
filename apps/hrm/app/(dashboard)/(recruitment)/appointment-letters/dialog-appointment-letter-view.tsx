'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { FileText } from 'lucide-react';
import { Button, CustomDialog, useToast } from '@archmage/ui';
import { generateAppointmentLetterAction } from '@/app/actions/recruitment-actions/appointment-letter.actions';
import { buttonStyles } from '@/lib/utils/common-styles';
import { formatDateTime } from '@/lib/utils/date';
import {
  PROBATION_PERIOD_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  canGenerateAppointmentLetter,
  type AppointmentLetterRecord
} from '@/types/recruitment';
import { useAppointmentLettersUi } from './appointment-letters-ui-context';
import AppointmentLetterStatusBadge from './status-badge';

type DialogAppointmentLetterViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: AppointmentLetterRecord | null;
};

type DetailRow = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

function DetailCard({ label, value, fullWidth }: DetailRow) {
  return (
    <div
      className={
        fullWidth
          ? 'rounded-md border border-border bg-muted/20 px-3 py-2 sm:col-span-2'
          : 'rounded-md border border-border bg-muted/20 px-3 py-2'
      }
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold">
        {value || '—'}
      </dd>
    </div>
  );
}

function formatDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function probationLabel(id: string): string {
  return PROBATION_PERIOD_OPTIONS.find((o) => o.id === id)?.name ?? id ?? '—';
}

export default function DialogAppointmentLetterView({
  open,
  setOpen,
  record
}: DialogAppointmentLetterViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { openLetterPreview } = useAppointmentLettersUi();
  const [loading, setLoading] = useState(false);

  const title = record
    ? `View ${record.letterNumber}`
    : 'Appointment letter';

  const rows: DetailRow[] = record
    ? [
        { label: 'Letter Number', value: record.letterNumber },
        { label: 'Candidate', value: record.candidateName },
        { label: 'Position', value: record.position },
        { label: 'Department', value: record.department },
        {
          label: 'Employment Type',
          value: VACANCY_EMPLOYMENT_TYPE_LABELS[record.employmentType]
        },
        {
          label: 'Appointment Date',
          value: formatDay(record.appointmentDate)
        },
        { label: 'Salary', value: record.salary },
        { label: 'Letter Date', value: formatDay(record.letterDate) },
        {
          label: 'Reporting Location',
          value: record.reportingLocation || '—'
        },
        {
          label: 'Reporting Manager',
          value: record.reportingManager || '—'
        },
        {
          label: 'Probation Period',
          value: probationLabel(record.probationPeriod)
        },
        {
          label: 'Benefits',
          value: record.benefits || '—',
          fullWidth: true
        },
        {
          label: 'Terms and Conditions',
          value: record.termsAndConditions || '—',
          fullWidth: true
        },
        {
          label: 'Created',
          value: record.createdBy
            ? `${record.createdBy} · ${formatDateTime(record.createdAt)}`
            : formatDateTime(record.createdAt)
        },
        {
          label: 'Updated',
          value: record.updatedBy
            ? `${record.updatedBy} · ${formatDateTime(record.updatedAt)}`
            : formatDateTime(record.updatedAt)
        }
      ]
    : [];

  return (
    <CustomDialog open={open} setOpen={setOpen} title={title}>
      <div className="space-y-4 py-4">
        {record ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <AppointmentLetterStatusBadge status={record.status} />
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <DetailCard key={row.label} {...row} />
              ))}
            </dl>
            {canGenerateAppointmentLetter(record) ? (
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  className={`${buttonStyles.save} gap-1.5`}
                  disabled={loading}
                  onClick={() => {
                    void (async () => {
                      setLoading(true);
                      const result = await generateAppointmentLetterAction(
                        record.id
                      );
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
                      setOpen(false);
                      openLetterPreview(result.data.record);
                      router.refresh();
                    })();
                  }}
                >
                  <FileText className="h-4 w-4" />
                  Generate Letter
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No record selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
