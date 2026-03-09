'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DAY_TYPES,
  DoctorSession,
  INSTITUTION_OPTIONS
} from '@/types/doctor.session';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import { DoctorSessionRecordActions } from './record-actions';
import Link from 'next/link';

function formatSessionFee(value: number | string | null | undefined): string {
  if (value == null || value === '') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return '-';
  return formatLKR(n);
}

export const DoctorSessionColumns: ColumnDef<DoctorSession>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },

  {
    id: 'doctorSession',
    header: 'Doctor Session',
    cell: ({ row }) => {
      const { name, id } = row.original;

      return (
        <div className="max-w-48 truncate">
          <Link
            href={`/doctor-sessions/${id}/edit`}
            className="font-medium text-primary hover:underline"
          >
            {name}
          </Link>
        </div>
      );
    }
  },

  {
    id: 'startEndTime',
    header: 'Start – End Time',
    cell: ({ row }) => {
      const start = row.original.startTime ? moment(row.original.startTime).format('hh.mm A') : '-';
      const end = row.original.endTime ? moment(row.original.endTime).format('hh.mm A') : '-';
      return <span className="whitespace-nowrap">{start} – {end}</span>;
    }
  },

  {
    id: 'sessionValue',
    header: () => <div className="text-right">Session Value</div>,
    cell: ({ row }) => (
      <div className="text-right whitespace-nowrap">
        <div><span className="text-muted-foreground">Local:</span> {formatSessionFee(row.original.amountLocal)}</div>
        <div><span className="text-muted-foreground">Foreign:</span> {formatSessionFee(row.original.amountForeign)}</div>
      </div>
    )
  },

  {
    id: 'patientNumber',
    header: () => <div className="text-right">Patient Number</div>,
    cell: ({ row }) => {
      const { startingPatientNumber, maxPatientNumber } = row.original;
      return (
        <div className="text-right">
          {startingPatientNumber} - {maxPatientNumber}
        </div>
      );
    }
  },

  {
    id: 'locationDepartmentInstitution',
    header: 'Location / Department / Institution',
    size: 280,
    cell: ({ row }) => {
      const { location, department, institution } = row.original;
      const institutionName = INSTITUTION_OPTIONS[institution] ?? { name: '' };

      return (
        <div className="min-w-[220px] max-w-[320px]">
          {location?.name ?? '-'} / {department?.name ?? '-'} /{' '}
          {institutionName.name ?? '-'}
        </div>
      );
    }
  },

  {
    accessorKey: 'updatedUser.name',
    header: 'Updated By'
  },

  {
    accessorKey: 'updatedAt',
    header: 'Updated Date',
    cell: ({ row }) => moment(row.getValue('updatedAt')).format('DD/MM/YYYY hh.mm A')
  },

  {
    accessorKey: 'createdUser.name',
    header: 'Created By'
  },

  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ row }) => moment(row.getValue('createdAt')).format('DD/MM/YYYY hh.mm A')
  },

  {
    accessorKey: 'status',
    header: () => <div className="text-center">Published</div>,
    cell: ({ row }) => {
      const status = row.getValue('status') as number;
      const isActive = status === 1;
      return (
        <div className="text-center">
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={
              isActive
                ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
                : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
            }
          >
            {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {isActive ? 'Published' : 'Unpublished'}
          </Badge>
        </div>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => (
      <div className="text-center">
        <DoctorSessionRecordActions row={row} />
      </div>
    )
  }
];
