'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  DEDUCTION_TYPE_LABELS,
  type DeductionComponentTypeId,
  type DeductionRecord
} from '@/types/payroll';
import {
  PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS,
  type PaysheetComponentIncludedForId
} from '@/types/paysheet-component';
import RecordActions from './record-actions';

const typeStyles: Record<DeductionComponentTypeId, string> = {
  fixed_deduction: 'bg-rose-100 text-rose-800 hover:bg-rose-100',
  loan: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  advance: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
};

const kindStyles: Record<string, string> = {
  system: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  custom: 'bg-violet-100 text-violet-800 hover:bg-violet-100'
};

function typeLabel(typeId: string): string {
  return (
    DEDUCTION_TYPE_LABELS[typeId as DeductionComponentTypeId] ?? typeId
  );
}

function includedLabel(ids: string[]): string {
  if (!ids.length) return '—';
  return ids
    .map(
      (id) =>
        PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS[
          id as PaysheetComponentIncludedForId
        ] ?? id
    )
    .join(', ');
}

export const deductionColumns: ColumnDef<DeductionRecord>[] = [
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
      <span className="font-medium tabular-nums">
        {row.original.code || '—'}
      </span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Deduction Name',
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
          typeStyles[row.original.typeId as DeductionComponentTypeId] ??
          'bg-slate-100 text-slate-700'
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
    id: 'includedFor',
    header: 'Included For',
    cell: ({ row }) => (
      <span className="max-w-[220px] truncate text-sm text-muted-foreground">
        {includedLabel(row.original.includedForIds)}
      </span>
    )
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

export const DEDUCTION_EXPORT_COLUMNS = [
  'Code',
  'Name',
  'Kind',
  'Type',
  'Order',
  'Included For',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
];

export const DEDUCTION_EXPORT_KEYS = [
  'code',
  'name',
  'kind',
  'typeId',
  'orderNo',
  'includedFor',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
];
