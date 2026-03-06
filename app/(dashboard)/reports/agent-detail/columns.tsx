'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Agency } from '@/types/agency';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';

export const AgentDetailReportColumns: ColumnDef<Agency>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.getValue<Date>('createdAt');
      if (!date) return '-';
      return (
        <div className="flex flex-col">
          <div>{moment(date).format('YYYY-MM-DD')}</div>
          <div>{moment(date).format('hh:mm A')}</div>
        </div>
      );
    }
  },
  {
    accessorKey: 'code',
    header: 'Agent Code',
    cell: ({ row }) => {
      const code = row.getValue<string>('code');
      return code ? code.toUpperCase() : '-';
    }
  },
  {
    accessorKey: 'name',
    header: 'Agent Name',
    cell: ({ row }) => {
      const name = row.getValue<string>('name');
      return <div className="max-w-[200px] truncate" title={name.toUpperCase()}>{name.toUpperCase()}</div>;
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
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
  },
  {
    id: 'address',
    header: 'Address',
    cell: ({ row }) => {
      const agency = row.original;
      const addressParts = [
        agency.addressLine1,
        agency.addressLine2,
        agency.city
      ].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : '-';
      return <div className="max-w-[200px] truncate" title={address}>{address}</div>;
    }
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.getValue<string>('phone');
      return phone || '-';
    }
  },
  {
    accessorKey: 'fax',
    header: 'Fax',
    cell: ({ row }) => {
      const fax = row.getValue<string>('fax');
      return fax || '-';
    }
  },
  {
    accessorKey: 'email',
    header: 'E-Mail',
    cell: ({ row }) => {
      const email = row.getValue<string>('email');
      return email || '-';
    }
  },
  {
    accessorKey: 'contactPersonName',
    header: 'Contact Person',
    cell: ({ row }) => {
      const contactPerson = row.getValue<string>('contactPersonName');
      return contactPerson || '-';
    }
  },
  {
    accessorKey: 'contactPersonPhone',
    header: 'Contact Phone',
    cell: ({ row }) => {
      const contactPhone = row.getValue<string>('contactPersonPhone');
      return contactPhone || '-';
    }
  },
  {
    accessorKey: 'contactPersonEmail',
    header: 'Contact Person E-mail',
    cell: ({ row }) => {
      const contactEmail = row.getValue<string>('contactPersonEmail');
      return contactEmail || '-';
    }
  },
  {
    accessorKey: 'allowedCreditLimit',
    header: 'Allowed Credit Limit',
    cell: ({ row }) => {
      const allowedCreditLimit = row.getValue<number>('allowedCreditLimit');
      return allowedCreditLimit?.toFixed(2) || '0.00';
    }
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const balance = row.getValue<number>('balance');
      return balance?.toFixed(2) || '0.00';
    }
  }
];
