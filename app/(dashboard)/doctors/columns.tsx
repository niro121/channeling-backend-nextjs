'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Doctor } from '@/types/doctor';
import { CheckCircle2, XCircle } from 'lucide-react';
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
      const id = row.original.id;
      const content = code ?? '—';
      if (id) {
        return (
          <Link
            href={`/doctors/${id}/edit`}
            className="max-w-28 truncate block text-primary hover:underline underline-offset-2 cursor-pointer"
            title={`Edit ${code ?? 'doctor'}`}
          >
            {content}
          </Link>
        );
      }
      return (
        <div className="max-w-28 truncate" title={code}>
          {content}
        </div>
      );
    }
  },
  {
    id: 'name',
    header: 'Doctor Name',
    cell: ({ row }) => {
      const title = row.original.title?.trim() ?? '';
      const name = row.original.name ?? '';
      const display = title ? `${title} ${name}`.trim() : name || '—';
      return <span className="truncate block max-w-48" title={display}>{display}</span>;
    }
  },
  {
    id: 'speciality',
    header: 'Speciality',
    cell: ({ row }) => {
      const speciality = row.original.speciality;
      const specialityName = speciality?.name ?? '—';
      return (
        <div className="max-w-32 truncate" title={specialityName}>
          {specialityName}
        </div>
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
    cell: ({ row }) => <DoctorRecordActions row={row} />
  }
];
