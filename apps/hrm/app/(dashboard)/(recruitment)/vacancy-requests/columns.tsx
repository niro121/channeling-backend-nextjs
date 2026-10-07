'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_PRIORITY_LABELS,
  VACANCY_REQUEST_STATUS_LABELS,
  type VacancyEmploymentType,
  type VacancyPriority,
  type VacancyRequestRecord,
  type VacancyRequestStatus
} from '@/types/recruitment';
import VacancyRecordActions from './record-actions';

const priorityClassName: Record<VacancyPriority, string> = {
  low: 'border-0 bg-sky-100 text-sky-800 hover:bg-sky-100',
  medium: 'border-0 bg-amber-100 text-amber-800 hover:bg-amber-100',
  high: 'border-0 bg-rose-100 text-rose-800 hover:bg-rose-100',
  urgent: 'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100'
};

const statusClassName: Record<VacancyRequestStatus, string> = {
  draft: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  pending_approval:
    'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100',
  approved: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  rejected: 'border-0 bg-red-100 text-red-800 hover:bg-red-100',
  closed: 'border-0 bg-slate-200 text-slate-700 hover:bg-slate-200',
  cancelled: 'border-0 bg-rose-100 text-rose-700 hover:bg-rose-100'
};

export const VACANCY_EXPORT_COLUMNS = [
  'Request ID',
  'Department',
  'Designation',
  'Vacancies',
  'Employment Type',
  'Requested By',
  'Requested Date',
  'Required Date',
  'Priority',
  'Status',
  'Created',
  'Updated'
] as const;

export const VACANCY_EXPORT_KEYS = [
  'requestId',
  'department',
  'designation',
  'vacancies',
  'employmentType',
  'requestedBy',
  'requestedDate',
  'requiredDate',
  'priority',
  'status',
  'createdAt',
  'updatedAt'
] as const;

export const vacancyRequestColumns: ColumnDef<VacancyRequestRecord>[] = [
  {
    accessorKey: 'requestId',
    header: 'Request ID',
    cell: ({ row }) => (
      <span className="font-medium text-primary">{row.original.requestId}</span>
    )
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
    accessorKey: 'vacancies',
    header: 'Vacancies',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.vacancies}</span>
    )
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
    accessorKey: 'requestedBy',
    header: 'Requested By'
  },
  {
    accessorKey: 'requestedDate',
    header: 'Requested Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(row.original.requestedDate, 'd MMM yyyy')}
      </span>
    )
  },
  {
    accessorKey: 'requiredDate',
    header: 'Required Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(row.original.requiredDate, 'd MMM yyyy')}
      </span>
    )
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.original.priority;
      return (
        <Badge variant="secondary" className={priorityClassName[priority]}>
          {VACANCY_PRIORITY_LABELS[priority]}
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
          {VACANCY_REQUEST_STATUS_LABELS[status]}
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
    cell: ({ row }) => <VacancyRecordActions record={row.original} />,
    enableHiding: false
  }
];
