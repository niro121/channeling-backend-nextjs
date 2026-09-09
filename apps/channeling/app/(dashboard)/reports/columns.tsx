'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';

export type ReportListItem = {
  id: string;
  rank: number;
  masterData: string;
  description: string;
  route: string;
};

export const reportColumns: ColumnDef<ReportListItem>[] = [
  {
    accessorKey: 'rank',
    header: '#',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.getValue<number>('rank')}
      </span>
    ),
  },
  {
    accessorKey: 'masterData',
    header: 'Report',
    cell: ({ row }) => {
      const masterData = row.getValue<string>('masterData');
      const route = row.original.route;
      return (
        <Link
          href={route}
          className="font-medium text-primary hover:underline underline-offset-2"
        >
          {masterData}
        </Link>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue<string>('description')}</span>
    ),
  },
];
