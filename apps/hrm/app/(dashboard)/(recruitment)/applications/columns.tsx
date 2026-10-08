'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_STAGE_LABELS,
  APPLICATION_STATUS_LABELS,
  type ApplicationRecord,
  type ApplicationSource,
  type ApplicationStage,
  type ApplicationStatus
} from '@/types/recruitment';
import ApplicationRecordActions from './record-actions';

const stageClassName: Record<ApplicationStage, string> = {
  applied: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  screening: 'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100',
  shortlisted: 'border-0 bg-sky-100 text-sky-800 hover:bg-sky-100',
  interview: 'border-0 bg-violet-100 text-violet-800 hover:bg-violet-100',
  selected: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  offer: 'border-0 bg-teal-100 text-teal-800 hover:bg-teal-100',
  hired: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  rejected: 'border-0 bg-red-100 text-red-800 hover:bg-red-100'
};

const statusClassName: Record<ApplicationStatus, string> = {
  active: 'border-0 bg-sky-100 text-sky-800 hover:bg-sky-100',
  rejected: 'border-0 bg-red-100 text-red-800 hover:bg-red-100',
  withdrawn: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  hired: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
};

export const APPLICATION_EXPORT_COLUMNS = [
  'Application ID',
  'Candidate Name',
  'Job Applied For',
  'Department',
  'Applied Date',
  'Experience',
  'Source',
  'Current Stage',
  'Status',
  'Created',
  'Updated'
] as const;

export const APPLICATION_EXPORT_KEYS = [
  'applicationId',
  'candidateName',
  'jobTitle',
  'department',
  'appliedDate',
  'experienceYears',
  'source',
  'currentStage',
  'status',
  'createdAt',
  'updatedAt'
] as const;

export const applicationColumns: ColumnDef<ApplicationRecord>[] = [
  {
    accessorKey: 'applicationId',
    header: 'Application ID',
    cell: ({ row }) => (
      <span className="font-medium text-primary">
        {row.original.applicationId}
      </span>
    )
  },
  {
    accessorKey: 'candidateName',
    header: 'Candidate Name'
  },
  {
    accessorKey: 'jobTitle',
    header: 'Job Applied For'
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.department}</span>
    )
  },
  {
    accessorKey: 'appliedDate',
    header: 'Applied Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(row.original.appliedDate, 'd MMM yyyy')}
      </span>
    )
  },
  {
    accessorKey: 'experienceYears',
    header: 'Experience',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.experienceYears} yrs
      </span>
    )
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const source = row.original.source as ApplicationSource;
      return APPLICATION_SOURCE_LABELS[source] ?? source;
    }
  },
  {
    accessorKey: 'currentStage',
    header: 'Current Stage',
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
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="secondary" className={statusClassName[status]}>
          {APPLICATION_STATUS_LABELS[status]}
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
    cell: ({ row }) => <ApplicationRecordActions record={row.original} />,
    enableHiding: false
  }
];
