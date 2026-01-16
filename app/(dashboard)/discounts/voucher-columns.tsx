'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { CircleCorrect, CircleX } from '@/components/icons';
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
    header: 'Actions',
    cell: ({ row }) => <VoucherRecordActions row={row} />
  }
];
