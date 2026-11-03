'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import {
  APPLICATION_STAGE_LABELS,
  SHORTLISTING_STATUS_LABELS,
  screeningScoreBarClass,
  screeningScoreTextClass,
  type ApplicationStage,
  type ShortlistingRecord,
  type ShortlistingStatus
} from '@/types/recruitment';
import ShortlistingRecordActions from './record-actions';

const stageClassName: Record<ApplicationStage, string> = {
  applied: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  screening: 'border-0 bg-amber-100 text-amber-800 hover:bg-amber-100',
  shortlisted: 'border-0 bg-sky-100 text-sky-800 hover:bg-sky-100',
  interview: 'border-0 bg-violet-100 text-violet-800 hover:bg-violet-100',
  selected: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  offer: 'border-0 bg-teal-100 text-teal-800 hover:bg-teal-100',
  hired: 'border-0 bg-green-100 text-green-800 hover:bg-green-100',
  rejected: 'border-0 bg-red-100 text-red-700 hover:bg-red-100'
};

const statusClassName: Record<ShortlistingStatus, string> = {
  to_review: 'border-0 bg-amber-100 text-amber-800 hover:bg-amber-100',
  shortlisted: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  on_hold: 'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100',
  rejected: 'border-0 bg-red-100 text-red-700 hover:bg-red-100'
};

export const SHORTLISTING_EXPORT_COLUMNS = [
  'Candidate Name',
  'Application ID',
  'Job Position',
  'Qualifications',
  'Experience',
  'Skills',
  'Application Date',
  'Screening Score',
  'Stage',
  'Status',
  'Created',
  'Updated'
] as const;

export const SHORTLISTING_EXPORT_KEYS = [
  'candidateName',
  'applicationId',
  'jobTitle',
  'qualifications',
  'experienceYears',
  'skills',
  'appliedDate',
  'screeningScore',
  'currentStage',
  'shortlistStatus',
  'createdAt',
  'updatedAt'
] as const;

export const shortlistingColumns: ColumnDef<ShortlistingRecord>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all on page"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select ${row.original.candidateName}`}
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'candidateName',
    header: 'Candidate Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.candidateName}</span>
    )
  },
  {
    accessorKey: 'applicationId',
    header: 'Application ID',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.applicationId}</span>
    )
  },
  {
    accessorKey: 'jobTitle',
    header: 'Job Position'
  },
  {
    accessorKey: 'qualifications',
    header: 'Qualifications'
  },
  {
    accessorKey: 'experienceYears',
    header: 'Experience',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.experienceYears} yrs</span>
    )
  },
  {
    accessorKey: 'skills',
    header: 'Skills',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.skills.join(', ') || '—'}
      </span>
    )
  },
  {
    accessorKey: 'appliedDate',
    header: 'Application Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(row.original.appliedDate, 'd MMM yyyy')}
      </span>
    )
  },
  {
    accessorKey: 'screeningScore',
    header: 'Screening Score',
    cell: ({ row }) => {
      const score = row.original.screeningScore;
      return (
        <div className="flex min-w-[5.5rem] items-center gap-2">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', screeningScoreBarClass(score))}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              screeningScoreTextClass(score)
            )}
          >
            {score}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: 'currentStage',
    header: 'Stage',
    cell: ({ row }) => {
      const stage = row.original.currentStage;
      return (
        <Badge variant="secondary" className={stageClassName[stage]}>
          {APPLICATION_STAGE_LABELS[stage]}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'shortlistStatus',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.shortlistStatus;
      return (
        <Badge variant="secondary" className={statusClassName[status]}>
          {SHORTLISTING_STATUS_LABELS[status]}
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
    cell: ({ row }) => <ShortlistingRecordActions record={row.original} />,
    enableHiding: false
  }
];
