'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Doctor } from '@/types/doctor';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
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
  }
];
