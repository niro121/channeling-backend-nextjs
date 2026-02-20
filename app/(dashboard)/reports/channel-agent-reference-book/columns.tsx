'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AgencyBook } from '@/types/agencybook';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';

export const ChannelAgentReferenceBookReportColumns: ColumnDef<AgencyBook>[] = [
  {
    id: 'sNo',
    header: 'S.No',
    cell: ({ row }) => {
      // S.No will be calculated in the component using the index
      return row.index + 1;
    }
  },
  {
    accessorKey: 'agency.name',
    header: 'Agent',
    cell: ({ row }) => {
      const agency = row.original.agency;
      const name = agency?.name || '-';
      return <div className="max-w-[200px] truncate" title={name.toUpperCase()}>{name.toUpperCase()}</div>;
    }
  },
  {
    accessorKey: 'bookNumber',
    header: 'Book Number',
    cell: ({ row }) => {
      const bookNumber = row.getValue<string>('bookNumber');
      return bookNumber ? bookNumber.toUpperCase() : '-';
    }
  },
  {
    accessorKey: 'utilizedPageCount',
    header: 'Utilized Page Count',
    cell: () => {
      return <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'startNumber',
    header: 'Starting Reference Number',
    cell: ({ row }) => {
      const startNumber = row.getValue<string>('startNumber');
      return startNumber || '-';
    }
  },
  {
    accessorKey: 'endNumber',
    header: 'Ending Reference Number',
    cell: ({ row }) => {
      const endNumber = row.getValue<string>('endNumber');
      return endNumber || '-';
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
      return date ? moment(date).format('YYYY-MM-DD hh:mm A') : '-';
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
      const updatedBy = row.original.updatedBy;
      return updatedBy && date ? moment(date).format('YYYY-MM-DD hh:mm A') : '-';
    }
  },
  {
    accessorKey: 'status',
    header: 'Active',
    cell: ({ row }) => {
      const status = row.getValue('status') as number | null;
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
