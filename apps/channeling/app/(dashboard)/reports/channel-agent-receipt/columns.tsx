'use client';

import moment from 'moment';
import { ColumnDef } from '@tanstack/react-table';
import { formatLKR } from '@/lib/format-money';
import type { ChannelAgentReceiptReportRow } from '@/types/reports/channel-agent-receipt';

export const ChannelAgentReceiptReportColumns: ColumnDef<ChannelAgentReceiptReportRow>[] = [
  {
    accessorKey: 'agentRef',
    header: 'Agent Reference',
  },
  {
    accessorKey: 'refNo',
    header: 'Receipt No',
  },
  {
    accessorKey: 'agency',
    header: 'Agency',
  },
  {
    accessorKey: 'patient',
    header: 'Patient',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'creator',
    header: 'Creator',
  },
  {
    accessorKey: 'createdDate',
    header: 'Created Date',
    cell: ({ row }) => {
      const createdDate = row.original.createdDate;
      return createdDate ? moment(createdDate).format('YYYY-MM-DD hh:mm A') : '-';
    },
  },
  {
    accessorKey: 'billValue',
    header: 'Bill Value',
    cell: ({ row }) => (
      <span className="text-right tabular-nums block">
        {formatLKR(Number(row.original.billValue ?? 0))}
      </span>
    ),
  },
];
