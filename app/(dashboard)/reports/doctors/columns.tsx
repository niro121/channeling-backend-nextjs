'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Doctor } from '@/types/doctor';
import { CircleCorrect, CircleX } from '@/components/icons';
import moment from 'moment';

export const DoctorReportColumns: ColumnDef<Doctor>[] = [
  {
    accessorKey: 'code',
    header: 'Doctor Code',
    cell: ({ row }) => {
      const code = row.getValue<string>('code');

      return (
        <div className="max-w-28 truncate" title={code}>
          {code}
        </div>
      );
    }
  },
  {
    accessorKey: 'name',
    header: 'Doctor Name'
  },
  {
    accessorKey: 'registrationNumber',
    header: 'Reg. Number',
    cell: ({ row }) => {
      const reg = row.getValue<string>('registrationNumber');
      return (
        <div className="max-w-28 truncate" title={reg}>
          {reg || "-"}
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
    cell: ({ row }) => {
      const date = row.getValue<Date>('updatedAt');
      return date ? moment(date).format('DD/MM/YYYY') : '-';
    }
  },
  {
    accessorKey: 'createdUser.name',
    header: 'Created By'
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ row }) => {
      const date = row.getValue<Date>('createdAt');
      return date ? moment(date).format('DD/MM/YYYY') : '-';
    }
  },
  {
    accessorKey: 'status',
    header: 'Published',
    cell: ({ row }) => {
      const show = row.getValue('status');
      return show === 1 ? (
        <CircleCorrect className="text-green-500 w-7 h-7 justify-self-center" />
      ) : (
        <CircleX className="text-red-500 w-7 h-7 justify-self-center" />
      );
    }
  }
];
