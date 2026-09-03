'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, TAG_TYPES } from '@/types/tag';
import TagRecordActions from './record-actions';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

// DEFINE THE COLUMNS OF THE TAG TABLE
export const tagColumns: ColumnDef<Tag>[] = [
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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const name = row.getValue<string>('name');
      const id = row.original.id;
      const content = name ?? '—';
      if (id) {
        return (
          <Link
            href={`/tags/${id}/edit`}
            className="max-w-28 truncate block text-primary hover:underline underline-offset-2 cursor-pointer"
            title={`Edit ${name ?? 'tag'}`}
          >
            {content}
          </Link>
        );
      }
      return <span className="max-w-28 truncate">{content}</span>;
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const typeVal = row.getValue('type');
      const typeNum = typeof typeVal === 'number' ? typeVal : Number(typeVal);
      return (typeNum >= 0 && typeNum <= 4 ? TAG_TYPES[typeNum] : null) ?? 'Unknown';
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
    cell: ({ row }) => <TagRecordActions row={row} />
  }
];
