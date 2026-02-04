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
import { DoctorSessionRecordActions } from './record-actions';
import Link from 'next/link';

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
      const { name, startTime, dayType, id } = row.original;

      const time = moment(startTime).format('hh.mm A');
      const day = DAY_TYPES[dayType] ?? '';

      return (
        <div className="max-w-48 truncate">
          <Link
            href={`/doctor-sessions/${id}/edit`}
            className="cursor-pointer hover:text-blue-700 transition duration-75"
          >
            {name} {time} ({day.name})
          </Link>
        </div>
      );
    }
  },

  {
    accessorKey: 'startTime',
    header: 'Start Time',
    cell: ({ row }) => moment(row.original.startTime).format('hh.mm A')
  },

  {
    accessorKey: 'endTime',
    header: 'End Time',
    cell: ({ row }) => moment(row.original.endTime).format('hh.mm A')
  },

  {
    accessorKey: 'amountLocal',
    header: 'Session Value (Local)'
  },

  {
    accessorKey: 'amountForeign',
    header: 'Session Value (Foreign)'
  },

  {
    id: 'patientNumber',
    header: 'Patient Number',
    cell: ({ row }) => {
      const { startingPatientNumber, maxPatientNumber } = row.original;
      return `${startingPatientNumber} - ${maxPatientNumber}`;
    }
  },

  {
    id: 'locationDepartmentInstitution',
    header: 'Location / Department / Institution',
    cell: ({ row }) => {
      const { location, department, institution } = row.original;
      const institutionName = INSTITUTION_OPTIONS[institution] ?? '';

      return (
        <div className="max-w-64 truncate">
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
    cell: ({ row }) => moment(row.getValue('updatedAt')).format('DD/MM/YYYY')
  },

  {
    accessorKey: 'createdUser.name',
    header: 'Created By'
  },

  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ row }) => moment(row.getValue('createdAt')).format('DD/MM/YYYY')
  },

  {
    accessorKey: 'status',
    header: 'Published',
    cell: ({ row }) => {
      const status = row.getValue('status') as number;
      const isActive = status === 1;
      return (
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
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <DoctorSessionRecordActions row={row} />
  }
];
