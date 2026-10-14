'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  ALLOWANCE_TYPE_LABELS,
  type AllowanceComponentTypeId,
  type AllowanceRecord
} from '@/types/payroll';
import {
  PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS,
  type PaysheetComponentIncludedForId
} from '@/types/paysheet-component';
import RecordActions from './record-actions';

const typeStyles: Record<AllowanceComponentTypeId, string> = {
  fixed_allowance:
    'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 whitespace-nowrap',
  percentage_allowance:
    'bg-lime-100 text-lime-800 hover:bg-lime-100 whitespace-nowrap'
};

const kindStyles: Record<string, string> = {
  system: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  custom: 'bg-violet-100 text-violet-800 hover:bg-violet-100'
};

function typeLabel(typeId: string): string {
  return (
    ALLOWANCE_TYPE_LABELS[typeId as AllowanceComponentTypeId] ?? typeId
  );
}

function includedForLabel(id: string): string {
  return (
    PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS[
      id as PaysheetComponentIncludedForId
    ] ?? id
  );
}

export const allowanceColumns: ColumnDef<AllowanceRecord>[] = [
  {
    id: 'rowNumber',
    header: 'No',
    cell: ({ row, table }) => {
      const pageIndex = table.getState().pagination?.pageIndex ?? 0;
      const pageSize = table.getState().pagination?.pageSize ?? 10;
      return (
        <span className="tabular-nums text-muted-foreground">
          {pageIndex * pageSize + row.index + 1}
        </span>
      );
    },
    enableHiding: false
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums whitespace-nowrap">
        {row.original.code || '—'}
      </span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Allowance Name',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.original.name || '—'}
      </span>
    )
  },
  {
    accessorKey: 'kind',
    header: 'Kind',
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={kindStyles[row.original.kind] ?? kindStyles.custom}
      >
        {row.original.kind === 'system' ? 'System' : 'Custom'}
      </Badge>
    )
  },
  {
    accessorKey: 'typeId',
    header: 'Type',
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={
          typeStyles[row.original.typeId as AllowanceComponentTypeId] ??
          'bg-slate-100 text-slate-700 whitespace-nowrap'
        }
      >
        {typeLabel(row.original.typeId)}
      </Badge>
    )
  },
  {
    accessorKey: 'orderNo',
    header: 'Order',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.orderNo}</span>
    )
  },
  {
    accessorKey: 'percentage',
    header: '%',
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap">
        {row.original.typeId === 'percentage_allowance' &&
        row.original.percentage != null
          ? `${row.original.percentage}%`
          : '—'}
      </span>
    )
  },
  {
    id: 'includedFor',
    header: 'Included For',
    cell: ({ row }) => {
      const ids = row.original.includedForIds;
      if (!ids.length) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex max-w-60 flex-col gap-1">
          {ids.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              title={includedForLabel(id)}
              className="h-auto max-w-full justify-start whitespace-normal break-words bg-slate-100 text-left text-slate-700 hover:bg-slate-100 rounded-xs!"
            >
              {includedForLabel(id)}
            </Badge>
          ))}
        </div>
      );
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.createdBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {row.original.createdAt
            ? formatDateTime(row.original.createdAt)
            : '—'}
        </span>
      </div>
    )
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {row.original.updatedAt
            ? formatDateTime(row.original.updatedAt)
            : '—'}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <RecordActions record={row.original} />,
    enableHiding: false
  }
];

export const ALLOWANCE_EXPORT_COLUMNS = [
  'Code',
  'Name',
  'Kind',
  'Type',
  'Order',
  'Percentage',
  'Included For',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
];

export const ALLOWANCE_EXPORT_KEYS = [
  'code',
  'name',
  'kind',
  'typeId',
  'orderNo',
  'percentage',
  'includedFor',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
];
