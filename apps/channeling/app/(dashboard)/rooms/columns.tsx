'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import { RoomRecordActions } from './record-actions';
import { Room } from '@/types/room';

export const RoomColumns: ColumnDef<Room>[] = [
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
    accessorKey: 'number',
    header: 'Room Number',
    cell: ({ row }) => {
      const number = row.getValue<string>('number');
      const id = row.original.id;
      const content = number ?? '—';
      if (id) {
        return (
          <Link
            href={`/rooms/${id}/edit`}
            className="max-w-28 truncate block text-primary hover:underline underline-offset-2 cursor-pointer"
            title={`Edit ${number ?? 'room'}`}
          >
            {content}
          </Link>
        );
      }
      return (
        <div className="max-w-28 truncate" title={number}>
          {content}
        </div>
      );
    }
  },
  {
    accessorKey: 'location.name',
    header: 'Location'
  },
  {
    accessorKey: 'zone.name',
    header: 'Zone',
    cell: ({ row }) => {
      const name = row.original.zone?.name;
      return (
        <span className="truncate block max-w-32" title={name ?? undefined}>
          {name ?? '—'}
        </span>
      );
    }
  },
  {
    id: 'occupancy',
    header: 'Occupancy',
    cell: ({ row }) => {
      const occupied = Boolean(row.original.currentOccupiedSessionId);
      return (
        <Badge
          variant={occupied ? 'secondary' : 'default'}
          className={occupied ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}
        >
          {occupied ? 'Occupied' : 'Available'}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const name = row.original.updatedUser?.name ?? '—';
      const date = row.original.updatedAt
        ? moment(row.original.updatedAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{date}</span>
        </div>
      );
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const name = row.original.createdUser?.name ?? '—';
      const date = row.original.createdAt
        ? moment(row.original.createdAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{date}</span>
        </div>
      );
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
    cell: ({ row }) => <RoomRecordActions row={row} />
  }
];
