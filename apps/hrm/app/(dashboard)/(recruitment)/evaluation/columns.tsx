'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { format, parseISO } from 'date-fns';
import { formatDateTime } from '@/lib/utils/date';
import {
  EVALUATION_DECISION_LABELS,
  EVALUATION_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  type EvaluationDecision,
  type EvaluationRecord,
  type EvaluationStatus,
  type InterviewType
} from '@/types/recruitment';
import EvaluationRecordActions from './record-actions';

const decisionClassName: Record<EvaluationDecision, string> = {
  recommended: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  recommended_with_conditions:
    'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100',
  hold: 'border-0 bg-amber-100 text-amber-800 hover:bg-amber-100',
  not_recommended: 'border-0 bg-red-100 text-red-700 hover:bg-red-100'
};

const statusClassName: Record<EvaluationStatus, string> = {
  draft: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  submitted: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
};

function formatDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export const EVALUATION_EXPORT_COLUMNS = [
  'Candidate',
  'Job Position',
  'Interview Date',
  'Interviewer',
  'Interview Type',
  'Overall Score',
  'Decision',
  'Status',
  'Created',
  'Updated'
] as const;

export const EVALUATION_EXPORT_KEYS = [
  'candidateName',
  'jobTitle',
  'interviewDate',
  'interviewer',
  'interviewType',
  'overallScore',
  'finalDecision',
  'status',
  'createdAt',
  'updatedAt'
] as const;

export const evaluationColumns: ColumnDef<EvaluationRecord>[] = [
  {
    accessorKey: 'candidateName',
    header: 'Candidate',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.candidateName}</span>
    )
  },
  {
    accessorKey: 'jobTitle',
    header: 'Job Position'
  },
  {
    accessorKey: 'interviewDate',
    header: 'Interview Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDay(row.original.interviewDate)}
      </span>
    )
  },
  {
    accessorKey: 'interviewer',
    header: 'Interviewer'
  },
  {
    accessorKey: 'interviewType',
    header: 'Interview Type',
    cell: ({ row }) => {
      const type = row.original.interviewType as InterviewType;
      return INTERVIEW_TYPE_LABELS[type] ?? type;
    }
  },
  {
    accessorKey: 'overallScore',
    header: 'Overall Score',
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {row.original.overallScore}
      </span>
    )
  },
  {
    accessorKey: 'finalDecision',
    header: 'Decision',
    cell: ({ row }) => {
      const decision = row.original.finalDecision;
      if (!decision) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant="secondary" className={decisionClassName[decision]}>
          {EVALUATION_DECISION_LABELS[decision]}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status as EvaluationStatus;
      return (
        <Badge variant="secondary" className={statusClassName[status]}>
          {EVALUATION_STATUS_LABELS[status]}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.updatedAt)}
        </span>
      </div>
    )
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.createdBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <EvaluationRecordActions record={row.original} />,
    enableHiding: false
  }
];
