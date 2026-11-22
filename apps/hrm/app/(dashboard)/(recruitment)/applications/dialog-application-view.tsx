'use client';

import { CustomDialog } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_STAGE_LABELS,
  APPLICATION_STATUS_LABELS,
  type ApplicationRecord
} from '@/types/recruitment';

type DialogApplicationViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: ApplicationRecord | null;
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

export default function DialogApplicationView({
  open,
  setOpen,
  record
}: DialogApplicationViewProps) {
  const title = record
    ? `View ${record.applicationId}`
    : 'Application details';

  const rows: DetailRow[] = record
    ? [
        { label: 'Application ID', value: record.applicationId },
        {
          label: 'Status',
          value: APPLICATION_STATUS_LABELS[record.status]
        },
        { label: 'Candidate Name', value: record.candidateName },
        { label: 'Email', value: record.candidateEmail || '—' },
        { label: 'Phone', value: record.candidatePhone || '—' },
        {
          label: 'Current Stage',
          value: APPLICATION_STAGE_LABELS[record.currentStage]
        },
        { label: 'Job Applied For', value: record.jobTitle },
        {
          label: 'Job Post ID',
          value: record.jobPostCode || record.jobPostId
        },
        { label: 'Department', value: record.department },
        {
          label: 'Applied Date',
          value: formatDateTime(record.appliedDate, 'dd MMM yyyy')
        },
        {
          label: 'Experience',
          value: `${record.experienceYears} yrs`
        },
        {
          label: 'Source',
          value: APPLICATION_SOURCE_LABELS[record.source]
        },
        {
          label: 'Resume',
          value: record.resumeFileName || '—'
        },
        {
          label: 'Notes',
          value: record.notes || '—',
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
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <DetailCard key={row.label} {...row} />
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No record selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
