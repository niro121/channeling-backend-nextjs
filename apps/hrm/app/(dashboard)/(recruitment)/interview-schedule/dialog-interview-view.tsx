'use client';

import { format, parseISO } from 'date-fns';
import { CustomDialog } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  type InterviewRecord
} from '@/types/recruitment';
import InterviewStatusBadge from './status-badge';

type DialogInterviewViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: InterviewRecord | null;
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
    return format(parseISO(dateStr), 'EEE dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export default function DialogInterviewView({
  open,
  setOpen,
  record
}: DialogInterviewViewProps) {
  const title = record
    ? `View ${record.interviewCode}`
    : 'Interview details';

  const rows: DetailRow[] = record
    ? [
        { label: 'Interview Code', value: record.interviewCode },
        {
          label: 'Application ID',
          value: record.applicationId || '—'
        },
        { label: 'Candidate', value: record.candidateName },
        { label: 'Position', value: record.jobTitle },
        { label: 'Department', value: record.department },
        {
          label: 'Interview Type',
          value: INTERVIEW_TYPE_LABELS[record.interviewType]
        },
        {
          label: 'Interview Date',
          value: formatDay(record.interviewDate)
        },
        {
          label: 'Time',
          value: `${record.startTime} – ${record.endTime}`
        },
        {
          label: 'Interviewer / Panel',
          value: record.interviewerPanel
        },
        {
          label: 'Location / Meeting Link',
          value: record.location || '—'
        },
        {
          label: 'Notes to Candidate',
          value: record.notesToCandidate || '—',
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
              <InterviewStatusBadge status={record.status} />
              <span className="text-sm text-muted-foreground">
                {INTERVIEW_STATUS_LABELS[record.status]}
              </span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <DetailCard key={row.label} {...row} />
              ))}
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No record selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
