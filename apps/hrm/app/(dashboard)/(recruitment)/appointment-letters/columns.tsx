'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { formatDateTime } from '@/lib/utils/date';
import {
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type AppointmentLetterRecord,
  type VacancyEmploymentType
} from '@/types/recruitment';
import AppointmentLetterRecordActions from './record-actions';
import AppointmentLetterStatusBadge from './status-badge';

function formatDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export const APPOINTMENT_LETTER_EXPORT_COLUMNS = [
  'Letter Number',
  'Candidate Name',
  'Position',
  'Department',
  'Employment Type',
  'Appointment Date',
  'Salary',
  'Letter Date',
  'Status',
  'Created',
  'Updated'
] as const;

export const APPOINTMENT_LETTER_EXPORT_KEYS = [
  'letterNumber',
  'candidateName',
  'position',
  'department',
  'employmentType',
  'appointmentDate',
  'salary',
  'letterDate',
  'status',
  'createdAt',
  'updatedAt'
] as const;

export const appointmentLetterColumns: ColumnDef<AppointmentLetterRecord>[] = [
  {
    accessorKey: 'letterNumber',
    header: 'Letter Number',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.letterNumber}
      </span>
    )
  },
  {
    accessorKey: 'candidateName',
    header: 'Candidate Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.candidateName}</span>
    )
  },
  {
    accessorKey: 'position',
    header: 'Position'
  },
  {
    accessorKey: 'department',
    header: 'Department'
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
    accessorKey: 'appointmentDate',
    header: 'Appointment Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDay(row.original.appointmentDate)}
      </span>
    )
  },
  {
    accessorKey: 'salary',
    header: 'Salary',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {row.original.salary}
      </span>
    )
  },
  {
    accessorKey: 'letterDate',
    header: 'Letter Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDay(row.original.letterDate)}
      </span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <AppointmentLetterStatusBadge status={row.original.status} />
    )
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
    cell: ({ row }) => (
      <AppointmentLetterRecordActions record={row.original} />
    ),
    enableHiding: false
  }
];
