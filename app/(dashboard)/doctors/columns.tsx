'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Doctor } from '@/types/doctor';
import { CircleCorrect, CircleX } from '@/components/icons';
import moment from 'moment';
import { DoctorRecordActions } from './record-actions';

export const DoctorColumns: ColumnDef<Doctor>[] = [
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
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
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
      return moment(row.getValue('updatedAt')).format('DD/MM/YYYY');
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
      return moment(row.getValue('createdAt')).format('DD/MM/YYYY');
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
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <DoctorRecordActions row={row} />
  }
];
