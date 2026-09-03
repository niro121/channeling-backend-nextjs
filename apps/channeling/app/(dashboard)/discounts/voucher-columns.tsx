'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Voucher } from '@/types/voucher';
import { VoucherRecordActions } from './voucher-record-actions';

export const VoucherColumns: ColumnDef<Voucher>[] = [
  {
    id: 'rowNumber',
    header: '#',
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'code',
    header: 'Code'
  },
  {
    accessorKey: 'limit',
    header: 'Limit'
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <VoucherRecordActions row={row} />
  }
];
