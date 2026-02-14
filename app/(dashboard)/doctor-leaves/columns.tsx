'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DoctorLeaveListItem } from '@/types/doctor.leave';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DoctorLeaveRecordActions } from './record-actions';
import moment from 'moment';
import Link from 'next/link';

export const DoctorLeaveColumns: ColumnDef<DoctorLeaveListItem>[] = [
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
    id: 'leaveCount',
    header: 'Leave count',
    cell: ({ row }) => {
      const leaveId = row.original.id;
      const raw = row.original.sessions;
      const count = Array.isArray(raw) ? raw.length : 0;
      if (!leaveId) {
        return <span>{count}</span>;
      }
      return (
        <Link
          href={`/doctor-leaves/${leaveId}/edit`}
          className="font-medium text-primary hover:underline"
        >
          Sessions: {count}
        </Link>
      );
    },
    enableSorting: false
  },
  {
    accessorKey: 'fromDate',
    header: 'From',
    cell: ({ row }) => {
      const dateValue = row.getValue<number>('fromDate');
      return moment(dateValue).format('YYYY-MM-DD');
    }
  },
  {
    accessorKey: 'toDate',
    header: 'To',
    cell: ({ row }) => {
      const dateValue = row.getValue<number>('toDate');
      return moment(dateValue).format('YYYY-MM-DD');
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue<number>('status');
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
          {isActive ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {isActive ? 'Active' : 'Cancel'}
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <DoctorLeaveRecordActions row={row} />
  }
];
