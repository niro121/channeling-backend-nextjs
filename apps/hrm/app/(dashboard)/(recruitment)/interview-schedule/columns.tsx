'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { formatDateTime } from '@/lib/utils/date';
import {
  INTERVIEW_TYPE_LABELS,
  type InterviewRecord,
  type InterviewType
} from '@/types/recruitment';
import InterviewRecordActions from './record-actions';
import InterviewStatusBadge from './status-badge';

function formatInterviewDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export const INTERVIEW_EXPORT_COLUMNS = [
  'Candidate',
  'Position',
  'Interview Date',
  'Start Time',
  'End Time',
  'Interviewer / Panel',
  'Interview Type',
  'Location / Meeting Link',
  'Status',
  'Created',
  'Updated'
] as const;

export const INTERVIEW_EXPORT_KEYS = [
  'candidateName',
  'jobTitle',
  'interviewDate',
  'startTime',
  'endTime',
  'interviewerPanel',
  'interviewType',
  'location',
  'status',
  'createdAt',
  'updatedAt'
] as const;

export const interviewColumns: ColumnDef<InterviewRecord>[] = [
  {
    accessorKey: 'candidateName',
    header: 'Candidate',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.candidateName}</span>
    )
  },
  {
    accessorKey: 'jobTitle',
    header: 'Position'
  },
  {
    accessorKey: 'interviewDate',
    header: 'Interview Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatInterviewDay(row.original.interviewDate)}
      </span>
    )
  },
  {
    accessorKey: 'startTime',
    header: 'Start Time',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.startTime}</span>
    )
  },
  {
    accessorKey: 'endTime',
    header: 'End Time',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.endTime}</span>
    )
  },
  {
    accessorKey: 'interviewerPanel',
    header: 'Interviewer / Panel'
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
    accessorKey: 'location',
    header: 'Location / Meeting Link',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.location || '—'}
      </span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <InterviewStatusBadge status={row.original.status} />
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
    cell: ({ row }) => <InterviewRecordActions record={row.original} />,
    enableHiding: false
  }
];
