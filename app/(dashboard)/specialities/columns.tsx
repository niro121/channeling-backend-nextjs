'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Speciality } from '@/types/speciality';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import { SpecialityRecordActions } from './record-actions';

export const SpecialityColumns: ColumnDef<Speciality>[] = [
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
    header: 'Speciality Code',
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
    header: 'Speciality Name'
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
    cell: ({ row }) => <SpecialityRecordActions row={row} />
  }
];
