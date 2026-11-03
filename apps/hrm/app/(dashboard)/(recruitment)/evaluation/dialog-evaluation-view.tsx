'use client';

import { format, parseISO } from 'date-fns';
import { Badge, CustomDialog } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  EVALUATION_CRITERIA,
  EVALUATION_CRITERION_LABELS,
  EVALUATION_DECISION_LABELS,
  EVALUATION_RATING_LABELS,
  EVALUATION_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  type EvaluationRecord
} from '@/types/recruitment';

type DialogEvaluationViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: EvaluationRecord | null;
  title?: string;
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

export default function DialogEvaluationView({
  open,
  setOpen,
  record,
  title
}: DialogEvaluationViewProps) {
  const dialogTitle =
    title ??
    (record
      ? `View ${record.candidateName} · ${record.interviewCode}`
      : 'Evaluation details');

  const rows: DetailRow[] = record
    ? [
        { label: 'Candidate', value: record.candidateName },
        { label: 'Job Position', value: record.jobTitle },
        {
          label: 'Interview Date',
          value: formatDay(record.interviewDate)
        },
        { label: 'Interviewer', value: record.interviewer },
        {
          label: 'Interview Type',
          value: INTERVIEW_TYPE_LABELS[record.interviewType]
        },
        { label: 'Interview Stage', value: record.interviewStage },
        {
          label: 'Overall Score',
          value: `${record.overallScore}/100`
        },
        {
          label: 'Status',
          value: EVALUATION_STATUS_LABELS[record.status]
        },
        {
          label: 'Recommendation',
          value: record.recommendation
            ? EVALUATION_DECISION_LABELS[record.recommendation]
            : '—'
        },
        {
          label: 'Final Decision',
          value: record.finalDecision
            ? EVALUATION_DECISION_LABELS[record.finalDecision]
            : '—'
        },
        {
          label: 'Strengths',
          value: record.strengths || '—',
          fullWidth: true
        },
        {
          label: 'Weaknesses',
          value: record.weaknesses || '—',
          fullWidth: true
        },
        {
          label: 'Interview Comments',
          value: record.interviewComments || '—',
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
    <CustomDialog open={open} setOpen={setOpen} title={dialogTitle}>
      <div className="space-y-4 py-4">
        {record ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <DetailCard key={row.label} {...row} />
              ))}
            </dl>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Criteria Ratings
              </p>
              <div className="flex flex-wrap gap-2">
                {EVALUATION_CRITERIA.map((id) => {
                  const rating = record.ratings[id];
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="border-0 bg-primary/10 text-primary hover:bg-primary/15"
                    >
                      {EVALUATION_CRITERION_LABELS[id]}
                      {rating
                        ? `: ${EVALUATION_RATING_LABELS[rating]}`
                        : ': —'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No record selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
