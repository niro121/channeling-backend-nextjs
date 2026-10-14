'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  JOB_POST_STATUS_LABELS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type JobPostRecord,
  type JobPostStatus,
  type VacancyEmploymentType
} from '@/types/recruitment';
import JobPostRecordActions from './record-actions';

const statusClassName: Record<JobPostStatus, string> = {
  draft: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  published: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  unpublished: 'border-0 bg-lime-100 text-lime-800 hover:bg-lime-100',
  closed: 'border-0 bg-slate-200 text-slate-700 hover:bg-slate-200'
};

export const JOB_POST_EXPORT_COLUMNS = [
  'Job Post ID',
  'Job Title',
  'Department',
  'Designation',
  'Employment Type',
  'Openings',
  'Posted Date',
  'Closing Date',
  'Applications',
  'Status',
  'Created',
  'Updated'
] as const;

export const JOB_POST_EXPORT_KEYS = [
  'jobPostId',
  'jobTitle',
  'department',
  'designation',
  'employmentType',
  'openings',
  'postedDate',
  'closingDate',
  'applicationsCount',
  'status',
  'createdAt',
  'updatedAt'
] as const;

export const jobPostColumns: ColumnDef<JobPostRecord>[] = [
  {
    accessorKey: 'jobPostId',
    header: () => <div className="whitespace-nowrap">Job Post ID</div>,
    cell: ({ row }) => (
      <span className="font-medium text-primary whitespace-nowrap">{row.original.jobPostId}</span>
    )
  },
  {
    accessorKey: 'jobTitle',
    header: 'Job Title'
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.department}</span>
    )
  },
  {
    accessorKey: 'designation',
    header: 'Designation'
  },
  {
    accessorKey: 'employmentType',
    header: 'Employment Type',
    cell: ({ row }) => {
      const type = row.original.employmentType as VacancyEmploymentType;
      return VACANCY_EMPLOYMENT_TYPE_LABELS[type] ?? type;
    }
  },
  {
    accessorKey: 'openings',
    header: 'Openings',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.openings}</span>
    )
  },
  {
    accessorKey: 'postedDate',
    header: 'Posted Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {row.original.postedDate
          ? formatDateTime(row.original.postedDate, 'd MMM yyyy')
          : '—'}
      </span>
    )
  },
  {
    accessorKey: 'closingDate',
    header: 'Closing Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(row.original.closingDate, 'd MMM yyyy')}
      </span>
    )
  },
  {
    accessorKey: 'applicationsCount',
    header: 'Applications',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-primary">
        {row.original.applicationsCount}
      </span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="secondary" className={statusClassName[status]}>
          {JOB_POST_STATUS_LABELS[status]}
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
    cell: ({ row }) => <JobPostRecordActions record={row.original} />,
    enableHiding: false
  }
];
