'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Location, LOCATION_OPTIONS } from '@/types/location';
import { CircleCorrect, CircleX } from '@/components/icons';
import moment from 'moment';
import { LocationRecordActions } from './record-actions';

export const LocationColumns: ColumnDef<Location>[] = [
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
    header: 'Location Code',
    cell: ({ row }) => {
      const code = row.getValue<string>('code');

      return (
        <div className="max-w-28 truncate" title={code}>
          {code || "-"}
        </div>
      );
    }
  },
  {
    accessorKey: 'name',
    header: 'Location Name'
  },
  {
    accessorKey: 'type',
    header: 'Location Type',
    cell: ({ row }) => {
      const { branchType } = row.original;

      const type = LOCATION_OPTIONS.find(
        (location) => String(branchType) === location.id
      );

      return <div title={type?.name}>{type?.name}</div>;
    }
  },
  {
    header: 'Address',
    cell: ({ row }) => {
      const { addressLine1, addressLine2, city } = row.original;

      const addressArr = [addressLine1, addressLine2, city];
      const address = addressArr.filter(Boolean).join(', ');

      return (
        <div className="max-w-72" title={address}>
          {address || "-"}
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
    cell: ({ row }) => <LocationRecordActions row={row} />
  }
];
