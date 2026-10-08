'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  APPLICATION_SOURCE_LABELS,
  RESUME_BANK_STATUS_LABELS,
  type ApplicationSource,
  type ResumeBankRecord,
  type ResumeBankStatus
} from '@/types/recruitment';
import ResumeBankRecordActions from './record-actions';

const statusClassName: Record<ResumeBankStatus, string> = {
  in_bank: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  linked: 'border-0 bg-sky-100 text-sky-800 hover:bg-sky-100',
  shortlisted: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
};

export const RESUME_BANK_EXPORT_COLUMNS = [
  'Candidate Name',
  'Resume/CV',
  'Email',
  'Phone',
  'Qualifications',
  'Experience',
  'Skills',
  'Preferred Position',
  'Preferred Department',
  'Location',
  'Source',
  'Date Added',
  'Status',
  'Created',
  'Updated'
] as const;

export const RESUME_BANK_EXPORT_KEYS = [
  'candidateName',
  'resumeFileName',
  'email',
  'phone',
  'qualifications',
  'experienceYears',
  'skills',
  'preferredPosition',
  'preferredDepartment',
  'location',
  'source',
  'dateAdded',
  'status',
  'createdAt',
  'updatedAt'
] as const;

export const resumeBankColumns: ColumnDef<ResumeBankRecord>[] = [
  {
    accessorKey: 'candidateName',
    header: 'Candidate Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.candidateName}</span>
    )
  },
  {
    accessorKey: 'resumeFileName',
    header: 'Resume/CV',
    cell: ({ row }) => (
      <span className="text-primary">{row.original.resumeFileName}</span>
    )
  },
  {
    accessorKey: 'email',
    header: 'Email'
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {row.original.phone}
      </span>
    )
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
    accessorKey: 'preferredPosition',
    header: 'Preferred Position'
  },
  {
    accessorKey: 'preferredDepartment',
    header: 'Preferred Department',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.preferredDepartment}
      </span>
    )
  },
  {
    accessorKey: 'location',
    header: 'Location'
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
    accessorKey: 'dateAdded',
    header: 'Date Added',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(row.original.dateAdded, 'd MMM yyyy')}
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
          {RESUME_BANK_STATUS_LABELS[status]}
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
    cell: ({ row }) => <ResumeBankRecordActions record={row.original} />,
    enableHiding: false
  }
];
